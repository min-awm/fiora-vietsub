import bcrypt from 'bcryptjs';
import assert, { AssertionError } from 'assert';
import jwt from 'jwt-simple';
import { Types } from '@fiora/database/mongoose';

import config from '@fiora/config/server';
import getRandomAvatar from '@fiora/utils/getRandomAvatar';
import { SALT_ROUNDS } from '@fiora/utils/const';
import User, { UserDocument } from '@fiora/database/mongoose/models/user';
import Group, { GroupDocument } from '@fiora/database/mongoose/models/group';
import Friend, { FriendDocument } from '@fiora/database/mongoose/models/friend';
import Socket from '@fiora/database/mongoose/models/socket';
import Message, {
    handleInviteV2Messages,
} from '@fiora/database/mongoose/models/message';
import Notification from '@fiora/database/mongoose/models/notification';
import {
    getNewRegisteredUserIpKey,
    getNewUserKey,
    Redis,
} from '@fiora/database/redis/initRedis';

const { isValid } = Types.ObjectId;

/** 一天时间 */
const OneDay = 1000 * 60 * 60 * 24;

interface Environment {
    /** 客户端系统 */
    os: string;
    /** 客户端浏览器 */
    browser: string;
    /** 客户端环境信息 */
    environment: string;
}

/**
 * 生成jwt token
 * @param user 用户
 * @param environment 客户端环境信息
 */
function generateToken(user: string, environment: string) {
    return jwt.encode(
        {
            user,
            environment,
            expires: Date.now() + config.tokenExpiresTime,
        },
        config.jwtSecret,
    );
}

/**
 * 处理注册时间不满24小时的用户
 * @param user 用户
 */
async function handleNewUser(user: UserDocument, ip = '') {
    // 将用户添加到新用户列表, 24小时后删除
    if (Date.now() - user.createTime.getTime() < OneDay) {
        const userId = user._id.toString();
        await Redis.set(getNewUserKey(userId), userId, Redis.Day);

        if (ip) {
            const registeredCount = await Redis.get(
                getNewRegisteredUserIpKey(ip),
            );
            await Redis.set(
                getNewRegisteredUserIpKey(ip),
                (parseInt(registeredCount || '0', 10) + 1).toString(),
                Redis.Day,
            );
        }
    }
}

async function getUserNotificationTokens(user: UserDocument) {
    const notifications = (await Notification.find({ user })) || [];
    return notifications.map(({ token }) => token);
}

/**
 * 注册新用户
 * @param ctx Context
 */
export async function register(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    assert(!config.disableRegister, 'Tính năng đăng ký đã bị tắt, Vui lòng liên hệ với quản trị viên để mở tài khoản');

    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Tên ngươi dung không được để trông');
    assert(password, 'Mật khẩu không thể để trống');

    const user = await User.findOne({ username });
    assert(!user, 'Tên người dùng này đã tồn tại');

    const registeredCountWithin24Hours = await Redis.get(
        getNewRegisteredUserIpKey(ctx.socket.ip),
    );
    assert(parseInt(registeredCountWithin24Hours || '0', 10) < 3, 'Lỗi hệ thống');

    const defaultGroup = await Group.findOne({ isDefault: true });
    if (!defaultGroup) {
        // TODO: refactor when node types support "Assertion Functions" https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
        throw new AssertionError({ message: 'Nhóm mặc định không tồn tại' });
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);

    let newUser = null;
    try {
        newUser = await User.create({
            username,
            salt,
            password: hash,
            avatar: getRandomAvatar(),
            lastLoginIp: ctx.socket.ip,
        } as UserDocument);
    } catch (err) {
        if ((err as Error).name === 'ValidationError') {
            return 'Tên người dùng chứa các ký tự không được hỗ trợ hoặc vượt quá giới hạn độ dài';
        }
        throw err;
    }

    await handleNewUser(newUser, ctx.socket.ip);

    if (!defaultGroup.creator) {
        defaultGroup.creator = newUser._id;
    }
    defaultGroup.members.push(newUser._id);
    await defaultGroup.save();

    const token = generateToken(newUser._id.toString(), environment);

    ctx.socket.user = newUser._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: newUser._id,
            os,
            browser,
            environment,
        },
    );

    return {
        _id: newUser._id,
        avatar: newUser.avatar,
        username: newUser.username,
        groups: [
            {
                _id: defaultGroup._id,
                name: defaultGroup.name,
                avatar: defaultGroup.avatar,
                creator: defaultGroup.creator,
                createTime: defaultGroup.createTime,
                messages: [],
            },
        ],
        friends: [],
        token,
        isAdmin: false,
        notificationTokens: [],
    };
}

/**
 * 账密登录
 * @param ctx Context
 */
export async function login(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Tên ngươi dung không được để trông');
    assert(password, 'Mật khẩu không thể để trống');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'Người dùng này không tòn tại' });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    assert(isPasswordCorrect, 'Sai mật khẩu');

    await handleNewUser(user);

    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;
    await user.save();

    const groups = await Group.find(
        { members: user._id },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    const token = generateToken(user._id.toString(), environment);

    ctx.socket.user = user._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    const notificationTokens = await getUserNotificationTokens(user);

    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        token,
        isAdmin: config.administrator.includes(user._id.toString()),
        notificationTokens,
    };
}

/**
 * token登录
 * @param ctx Context
 */
export async function loginByToken(
    ctx: Context<{ token: string } & Environment>,
) {
    const { token, os, browser, environment } = ctx.data;
    assert(token, 'Token Không thể trống');

    let payload = null;
    try {
        payload = jwt.decode(token, config.jwtSecret);
    } catch (err) {
        return 'Token không hợp lệ';
    }

    assert(Date.now() < payload.expires, 'token hết hạn');
    assert.equal(environment, payload.environment, 'Đăng nhập trái phép');

    const user = await User.findOne(
        { _id: payload.user },
        {
            _id: 1,
            avatar: 1,
            username: 1,
            tag: 1,
            createTime: 1,
        },
    );
    if (!user) {
        throw new AssertionError({ message: 'Người dùng không tồn tại' });
    }

    await handleNewUser(user);

    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;
    await user.save();

    const groups = await Group.find(
        { members: user._id },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group: GroupDocument) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    ctx.socket.user = user._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    const notificationTokens = await getUserNotificationTokens(user);

    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        isAdmin: config.administrator.includes(user._id.toString()),
        notificationTokens,
    };
}

/**
 * 游客登录, 只能获取默认群组信息
 * @param ctx Context
 */
export async function guest(ctx: Context<Environment>) {
    const { os, browser, environment } = ctx.data;

    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            os,
            browser,
            environment,
        },
    );

    const group = await Group.findOne(
        { isDefault: true },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            createTime: 1,
            creator: 1,
        },
    );
    if (!group) {
        throw new AssertionError({ message: 'Nhóm mặc định không tồn tại' });
    }
    ctx.socket.join(group._id.toString());

    const messages = await Message.find(
        { to: group._id },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
            deleted: 1,
        },
        { sort: { createTime: -1 }, limit: 15 },
    ).populate('from', { username: 1, avatar: 1 });
    await handleInviteV2Messages(messages);
    messages.reverse();

    return { messages, ...group.toObject() };
}

/**
 * 修改用户头像
 * @param ctx Context
 */
export async function changeAvatar(ctx: Context<{ avatar: string }>) {
    const { avatar } = ctx.data;
    assert(avatar, 'Link avatar mới không được để trống');

    await User.updateOne(
        { _id: ctx.socket.user },
        {
            avatar,
        },
    );

    return {};
}

/**
 * 添加好友, 单向添加
 * @param ctx Context
 */
export async function addFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(isValid(userId), 'ID người dùng không hợp lệ');
    assert(ctx.socket.user !== userId, 'Không thể thêm tôi làm bạn bè');

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new AssertionError({ message: 'Không thể thêm bạn bè, Người dùng không tồn tại' });
    }

    const friend = await Friend.find({ from: ctx.socket.user, to: user._id });
    assert(friend.length === 0, 'Bạn đã là bạn rồi');

    const newFriend = await Friend.create({
        from: ctx.socket.user as string,
        to: user._id,
    } as FriendDocument);

    return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        from: newFriend.from,
        to: newFriend.to,
    };
}

/**
 * 删除好友, 单向删除
 * @param ctx Context
 */
export async function deleteFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(isValid(userId), 'ID người dùng không hợp lệ');

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new AssertionError({ message: 'Người dùng không tồn tại' });
    }

    await Friend.deleteOne({ from: ctx.socket.user, to: user._id });
    return {};
}

/**
 * 修改用户密码
 * @param ctx Context
 */
export async function changePassword(
    ctx: Context<{ oldPassword: string; newPassword: string }>,
) {
    const { oldPassword, newPassword } = ctx.data;
    assert(newPassword, 'Mật khẩu mới không được để trống');
    assert(oldPassword !== newPassword, 'Mật khẩu mới không được giống mật khẩu cũ');

    const user = await User.findOne({ _id: ctx.socket.user });
    if (!user) {
        throw new AssertionError({ message: 'Người dùng không tồn tại' });
    }
    const isPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
    assert(isPasswordCorrect, 'Mật khẩu cũ không đúng');

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password = hash;
    await user.save();

    return {
        msg: 'ok',
    };
}

/**
 * 修改用户名
 * @param ctx Context
 */
export async function changeUsername(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username, 'Tên người dùng mới không được để trống');

    const user = await User.findOne({ username });
    assert(!user, 'Tên người dùng này đã tồn tại, Thử một cái khac');

    const self = await User.findOne({ _id: ctx.socket.user });
    if (!self) {
        throw new AssertionError({ message: 'Người dùng không tồn tại' });
    }

    self.username = username;
    await self.save();

    return {
        msg: 'ok',
    };
}

/**
 * 重置用户密码, 需要管理员权限
 * @param ctx Context
 */
export async function resetUserPassword(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', 'username không được để trống');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'Người dùng không tồn tại' });
    }

    const newPassword = 'helloworld';
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(newPassword, salt);

    user.salt = salt;
    user.password = hash;
    await user.save();

    return {
        newPassword,
    };
}

/**
 * 更新用户标签, 需要管理员权限
 * @param ctx Context
 */
export async function setUserTag(
    ctx: Context<{ username: string; tag: string }>,
) {
    const { username, tag } = ctx.data;
    assert(username !== '', 'username Không thể trống');
    assert(tag !== '', 'tag Không thể trống');
    assert(
        /^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,5}$/.test(tag),
        'Không hợp lệ, cho phép 5 ký tự hoặc 10 chữ cái',
    );

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'Người dùng không tồn tại' });
    }

    user.tag = tag;
    await user.save();

    const sockets = await Socket.find({ user: user._id });
    const socketIdList = sockets.map((socket) => socket.id);
    if (socketIdList.length) {
        ctx.socket.emit(socketIdList, 'changeTag', user.tag);
    }

    return {
        msg: 'ok',
    };
}

/**
 * 获取指定在线用户 ip
 */
export async function getUserIps(
    ctx: Context<{ userId: string }>,
): Promise<string[]> {
    const { userId } = ctx.data;
    assert(userId, 'userId Không thể trống');
    assert(isValid(userId), 'userId không hợp lệ');

    const sockets = await Socket.find({ user: userId });
    const ipList = sockets.map((socket) => socket.ip) || [];
    return Array.from(new Set(ipList));
}

const UserOnlineStatusCacheExpireTime = 1000 * 60;
function getUserOnlineStatusWrapper() {
    const cache: Record<
        string,
        {
            value: boolean;
            expireTime: number;
        }
    > = {};
    return async function getUserOnlineStatus(
        ctx: Context<{ userId: string }>,
    ) {
        const { userId } = ctx.data;
        assert(userId, 'userId Không thể trống');
        assert(isValid(userId), 'userId không hợp lệ');

        if (cache[userId] && cache[userId].expireTime > Date.now()) {
            return {
                isOnline: cache[userId].value,
            };
        }

        const sockets = await Socket.find({ user: userId });
        const isOnline = sockets.length > 0;
        cache[userId] = {
            value: isOnline,
            expireTime: Date.now() + UserOnlineStatusCacheExpireTime,
        };
        return {
            isOnline,
        };
    };
}
export const getUserOnlineStatus = getUserOnlineStatusWrapper();
