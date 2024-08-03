import assert, { AssertionError } from 'assert';
import { Types } from '@fiora/database/mongoose';
import stringHash from 'string-hash';

import config from '@fiora/config/server';
import getRandomAvatar from '@fiora/utils/getRandomAvatar';
import Group, { GroupDocument } from '@fiora/database/mongoose/models/group';
import Socket from '@fiora/database/mongoose/models/socket';
import Message from '@fiora/database/mongoose/models/message';

const { isValid } = Types.ObjectId;

/**
 * 获取指定群组的在线用户辅助方法
 * @param group 群组
 */
async function getGroupOnlineMembersHelper(group: GroupDocument) {
    const sockets = await Socket.find(
        {
            user: {
                $in: group.members.map((member) => member.toString()),
            },
        },
        {
            os: 1,
            browser: 1,
            environment: 1,
            user: 1,
        },
    ).populate('user', { username: 1, avatar: 1 });
    const filterSockets = sockets.reduce((result, socket) => {
        result.set(socket.user._id.toString(), socket);
        return result;
    }, new Map());
    return Array.from(filterSockets.values());
}

/**
 * 创建群组
 * @param ctx Context
 */
export async function createGroup(ctx: Context<{ name: string }>) {
    assert(!config.disableCreateGroup, 'Quản trị viên đã tắt khả năng tạo nhóm');

    const ownGroupCount = await Group.count({ creator: ctx.socket.user });
    assert(
        ctx.socket.isAdmin || ownGroupCount < config.maxGroupsCount,
        `Không tạo được nhóm, bạn đã tạo${config.maxGroupsCount}các nhóm`,
    );

    const { name } = ctx.data;
    assert(name, 'Tên nhóm không được để trống');

    const group = await Group.findOne({ name });
    assert(!group, 'Nhóm đã tồn tại');

    let newGroup = null;
    try {
        newGroup = await Group.create({
            name,
            avatar: getRandomAvatar(),
            creator: ctx.socket.user,
            members: [ctx.socket.user],
        } as GroupDocument);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return 'Tên nhóm chứa các ký tự không được hỗ trợ hoặc vượt quá giới hạn độ dài';
        }
        throw err;
    }

    ctx.socket.join(newGroup._id.toString());
    return {
        _id: newGroup._id,
        name: newGroup.name,
        avatar: newGroup.avatar,
        createTime: newGroup.createTime,
        creator: newGroup.creator,
    };
}

/**
 * 加入群组
 * @param ctx Context
 */
export async function joinGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), 'ID nhóm không hợp lệ');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Không thể tham gia nhóm, Nhóm không tồn tại' });
    }
    assert(group.members.indexOf(ctx.socket.user) === -1, 'Bạn đã ở trong nhóm');

    group.members.push(ctx.socket.user);
    await group.save();

    const messages = await Message.find(
        { toGroup: groupId },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
        },
        { sort: { createTime: -1 }, limit: 3 },
    ).populate('from', { username: 1, avatar: 1 });
    messages.reverse();

    ctx.socket.join(group._id.toString());

    return {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        createTime: group.createTime,
        creator: group.creator,
        messages,
    };
}

/**
 * 退出群组
 * @param ctx Context
 */
export async function leaveGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), 'ID nhóm không hợp lệ');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Nhóm không tồn tại' });
    }

    // 默认群组没有creator
    if (group.creator) {
        assert(
            group.creator.toString() !== ctx.socket.user.toString(),
            'Chủ sở hữu nhóm không thể thoát khỏi nhóm mà họ đã tạo.',
        );
    }

    const index = group.members.indexOf(ctx.socket.user);
    assert(index !== -1, 'Bạn không có trong nhóm');

    group.members.splice(index, 1);
    await group.save();

    ctx.socket.leave(group._id.toString());

    return {};
}

const GroupOnlineMembersCacheExpireTime = 1000 * 60;

/**
 * 获取群组在线成员
 */
function getGroupOnlineMembersWrapperV2() {
    const cache: Record<
        string,
        {
            key?: string;
            value: any;
            expireTime: number;
        }
    > = {};
    return async function getGroupOnlineMembersV2(
        ctx: Context<{ groupId: string; cache?: string }>,
    ) {
        const { groupId, cache: cacheKey } = ctx.data;
        assert(isValid(groupId), 'ID nhóm không hợp lệ');

        if (
            cache[groupId] &&
            cache[groupId].key === cacheKey &&
            cache[groupId].expireTime > Date.now()
        ) {
            return { cache: cacheKey };
        }

        const group = await Group.findOne({ _id: groupId });
        if (!group) {
            throw new AssertionError({ message: 'Nhóm không tồn tại' });
        }
        const result = await getGroupOnlineMembersHelper(group);
        const resultCacheKey = stringHash(
            result.map((item) => item.user._id).join(','),
        ).toString(36);
        if (cache[groupId] && cache[groupId].key === resultCacheKey) {
            cache[groupId].expireTime =
                Date.now() + GroupOnlineMembersCacheExpireTime;
            if (resultCacheKey === cacheKey) {
                return { cache: cacheKey };
            }
        }

        cache[groupId] = {
            key: resultCacheKey,
            value: result,
            expireTime: Date.now() + GroupOnlineMembersCacheExpireTime,
        };
        return {
            cache: resultCacheKey,
            members: result,
        };
    };
}
export const getGroupOnlineMembersV2 = getGroupOnlineMembersWrapperV2();

export async function getGroupOnlineMembers(
    ctx: Context<{ groupId: string; cache?: string }>,
) {
    const result = await getGroupOnlineMembersV2(ctx);
    return result.members;
}

/**
 * 获取默认群组的在线成员
 * 无需登录态
 */
function getDefaultGroupOnlineMembersWrapper() {
    let cache: any = null;
    let expireTime = 0;
    return async function getDefaultGroupOnlineMembers() {
        if (cache && expireTime > Date.now()) {
            return cache;
        }

        const group = await Group.findOne({ isDefault: true });
        if (!group) {
            throw new AssertionError({ message: 'Nhóm không tồn tại' });
        }
        cache = await getGroupOnlineMembersHelper(group);
        expireTime = Date.now() + GroupOnlineMembersCacheExpireTime;
        return cache;
    };
}
export const getDefaultGroupOnlineMembers = getDefaultGroupOnlineMembersWrapper();

/**
 * 修改群头像, 只有群创建者有权限
 * @param ctx Context
 */
export async function changeGroupAvatar(
    ctx: Context<{ groupId: string; avatar: string }>,
) {
    const { groupId, avatar } = ctx.data;
    assert(isValid(groupId), 'ID nhóm không hợp lệ');
    assert(avatar, 'Địa chỉ avatar không được để trống');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Nhóm không tồn tại' });
    }
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        'Chỉ chủ nhóm mới có thể sửa đổi hình đại diện',
    );

    await Group.updateOne({ _id: groupId }, { avatar });
    return {};
}

/**
 * 修改群组头像, 只有群创建者有权限
 * @param ctx Context
 */
export async function changeGroupName(
    ctx: Context<{ groupId: string; name: string }>,
) {
    const { groupId, name } = ctx.data;
    assert(isValid(groupId), 'ID nhóm không hợp lệ');
    assert(name, 'Tên nhóm không được để trống');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Nhóm không tồn tại' });
    }
    assert(group.name !== name, 'Tên nhóm mới không thể giống với tên trước đó');
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        'Chỉ chủ nhóm mới có thể sửa đổi hình đại diện',
    );

    const targetGroup = await Group.findOne({ name });
    assert(!targetGroup, 'Tên nhóm đã tồn tại');

    await Group.updateOne({ _id: groupId }, { name });

    ctx.socket.emit(groupId, 'changeGroupName', { groupId, name });

    return {};
}

/**
 * 删除群组, 只有群创建者有权限
 * @param ctx Context
 */
export async function deleteGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), 'ID nhóm không hợp lệ');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Nhóm không tồn tại' });
    }
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        'Chỉ chủ sở hữu nhóm mới có thể giải thể nhóm',
    );
    assert(group.isDefault !== true, 'Nhóm mặc định không cho phép giải tán');

    await Group.deleteOne({ _id: group });

    ctx.socket.emit(groupId, 'deleteGroup', { groupId });

    return {};
}

export async function getGroupBasicInfo(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), 'ID nhóm không hợp lệ');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Nhóm không tồn tại' });
    }

    return {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        members: group.members.length,
    };
}
