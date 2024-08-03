import React from 'react';

import AlipayImage from '@fiora/assets/images/alipay.png';
import WxpayImage from '@fiora/assets/images/wxpay.png';
import Dialog from '../../components/Dialog';
import Style from './Reward.less';

interface RewardProps {
    visible: boolean;
    onClose: () => void;
}

function Reward(props: RewardProps) {
    const { visible, onClose } = props;
    return (
        <Dialog
            className={Style.reward}
            visible={visible}
            title="Phần thưởng"
            onClose={onClose}
        >
            <div>
                <p className={Style.text}>
                    Nếu bạn cho rằng mã phòng trò chuyện này hữu ích với bạn, tôi hy vọng bạn có thể tặng tôi phần thưởng
                    <br />
                    Tác giả trực tuyến hầu hết thời gian. Các câu hỏi đều được chào đón và tất cả các câu hỏi sẽ được trả lời.
                </p>
                {/* <div className={Style.imageContainer}>
                    <img
                        className={Style.image}
                        src={AlipayImage}
                        alt="Mã QR của Alipay"
                    />
                    <img
                        className={Style.image}
                        src={WxpayImage}
                        alt="Mã QR Wechat"
                    />
                </div> */}
            </div>
        </Dialog>
    );
}

export default Reward;
