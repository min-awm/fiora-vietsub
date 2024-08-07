import React from 'react';

import Style from './InviteMessage.less';
import { joinGroup, getLinkmanHistoryMessages } from '../../../service';
import useAction from '../../../hooks/useAction';
import Message from '../../../components/Message';

interface InviteMessageProps {
    inviteInfo: string;
}

function InviteMessage(props: InviteMessageProps) {
    const { inviteInfo } = props;
    const invite = JSON.parse(inviteInfo);

    const action = useAction();

    async function handleJoinGroup() {
        const group = await joinGroup(invite.group);
        if (group) {
            group.type = 'group';
            action.addLinkman(group, true);
            Message.success('Đã tham gia nhóm thành công');
            const messages = await getLinkmanHistoryMessages(invite.group, 0);
            if (messages) {
                action.addLinkmanHistoryMessages(invite.group, messages);
            }
        }
    }

    return (
        <div
            className={Style.inviteMessage}
            onClick={handleJoinGroup}
            role="button"
        >
            <div className={Style.info}>
                <span className={Style.info}>
                    &quot;{invite.inviterName}&quot; Mời các bạn vào nhóm
                    {invite.groupName}」
                </span>
            </div>
            <p className={Style.join}>Tham gia vào</p>
        </div>
    );
}

export default InviteMessage;
