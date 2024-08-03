import WuZeiNiangImage from '@fiora/assets/images/wuzeiniang.gif';

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

function convertSystemMessage(message: any) {
    if (message.type === 'system') {
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'Admin';
        message.from.avatar = WuZeiNiangImage;

        const content = JSON.parse(message.content);
        switch (content.command) {
            case 'roll': {
                message.content = `Ném${content.value}điểm (giới hạn trên${content.top}điểm)`;
                break;
            }
            case 'rps': {
                message.content = `Đùng đến ${content.value}`;
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
}

export default function convertMessage(message: any) {
    convertSystemMessage(message);
    return message;
}
