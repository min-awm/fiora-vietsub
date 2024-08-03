// function convertRobot10Message(message) {
//     if (message.from._id === '5adad39555703565e7903f79') {
//         try {
//             const parseMessage = JSON.parse(message.content);
//             message.from.tag = parseMessage.source;
//             message.from.avatar = parseMessage.avatar;
//             message.from.username = parseMessage.username;
//             message.type = parseMessage.type;
//             message.content = parseMessage.content;
//         } catch (err) {
//             console.warn('解析robot10消息失败', err);
//         }
//     }
// }

import { Message } from '../types/redux';

const WuZeiNiangImage = require('../assets/images/wuzeiniang.gif');

function convertSystemMessage(message: Message) {
    if (message.type === 'system') {
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'Admin';
        message.from.avatar = WuZeiNiangImage;
        message.from.tag = 'system';

        let content = null;
        try {
            content = JSON.parse(message.content);
        } catch {
            content = {
                command: 'parse-error',
            };
        }
        switch (content?.command) {
            case 'roll': {
                message.content = `Ném${content.value}điểm (giới hạn trên${content.top}điểm)`;
                break;
            }
            case 'rps': {
                message.content = `Dùng đến ${content.value}`;
                break;
            }
            default: {
                message.content = 'Lệnh không được hỗ trợ';
            }
        }
    } else if (message.deleted) {
        message.type = 'system';
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'Admin';
        message.from.avatar = WuZeiNiangImage;
        message.from.tag = 'system';
        message.content = `Đã thu hồi tin nhắn`;
    }

    return message;
}

/**
 * 处理文本消息的html转义字符
 * @param {Object} message 消息
 */
function convertMessageHtml(message: Message) {
    if (message.type === 'text') {
        message.content = message.content
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }
    return message;
}

export default function convertMessage(message: Message) {
    convertSystemMessage(message);
    convertMessageHtml(message);
    return message;
}
