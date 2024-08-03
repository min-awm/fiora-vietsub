import React from 'react';

import Dialog from '../../components/Dialog';
import Style from './About.less';
import Common from './Common.less';

interface AboutProps {
    visible: boolean;
    onClose: () => void;
}

function About(props: AboutProps) {
    const { visible, onClose } = props;
    return (
        <Dialog
            className={Style.about}
            visible={visible}
            title="Về chúng tôi"
            onClose={onClose}
        >
            <div>
                <div className={Common.block}>
                    <p className={Common.title}>Tác giả</p>
                    <a
                        href="# "
                        target="_black"
                        rel="noopener noreferrer"
                    >
                        https://t.me/kohdev
                    </a>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Làm thế nào để xây dựng</p>
                    <a
                        href="# "
                        target="_black"
                        rel="noopener noreferrer"
                    >
                        {/* https://yinxin630.github.io/fiora/zh-Hans/ */}
                    </a>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Chính sách bảo mật</p>
                    <a
                        href="/PrivacyPolicy.html"
                        target="_black"
                        rel="noopener noreferrer"
                    >
                        {/* {`${window.location.origin}/PrivacyPolicy.html`} */}
                    </a>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Cài đặt fiora vào màn hình chính</p>
                    <ul>
                        <li>
                            Nhấp vào nút ba chấm ở ngoài cùng bên phải của thanh địa chỉ (hoặc nút ở cuối thanh địa chỉ trước mục yêu thích)
                        </li>
                        <li>Chọn&quot;Cài đặt fiora&quot;</li>
                    </ul>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Phím tắt hộp nhập liệu</p>
                    <ul>
                        <li>Alt + S: Gửi vui</li>
                        <li>Alt + D: Gửi biểu tượng cảm xúc</li>
                    </ul>
                </div>
                {/* <div className={Common.block}>
                    <p className={Common.title}>Tin nhắn lệnh</p>
                    <ul>
                        <li>-roll [number]: Điểm ném</li>
                        <li>-rps: Oẳn tù tì</li>
                    </ul>
                </div> */}
                {/* <div className={Common.block}>
                    <p className={Common.title}>Liên kết</p>
                    <ul>
                        <li>
                            <a
                                href="# "
                                target="_black"
                                rel="noopener noreferrer"
                            >
                                Mu Zi Xing Xi
                            </a>
                        </li>
                    </ul>
                </div> */}
            </div>
        </Dialog>
    );
}

export default About;
