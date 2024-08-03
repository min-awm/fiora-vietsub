import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Switch from 'react-switch';
import { RadioGroup, RadioButton } from 'react-radio-buttons';
import ReactLoading from 'react-loading';
import { TwitterPicker } from 'react-color';

import setCssVariable from '../../utils/setCssVariable';
import readDiskFile from '../../utils/readDiskFile';
import uploadFile, { getOSSFileUrl } from '../../utils/uploadFile';
import playSound from '../../utils/playSound';
import Dialog from '../../components/Dialog';
import config from '../../../../config/client';
import Message from '../../components/Message';
import useAction from '../../hooks/useAction';
import { State } from '../../state/reducer';

import Style from './Setting.less';
import Common from './Common.less';
import {
    Tabs,
    TabPane,
    ScrollableInkTabBar,
    TabContent,
} from '../../components/Tabs';
import { LocalStorageKey } from '../../localStorage';
import themes from '../../themes';

interface SettingProps {
    visible: boolean;
    onClose: () => void;
}

type Color = {
    rgb: {
        r: number;
        g: number;
        b: number;
    };
};

function Setting(props: SettingProps) {
    const { visible, onClose } = props;

    const action = useAction();
    const soundSwitch = useSelector((state: State) => state.status.soundSwitch);
    const notificationSwitch = useSelector(
        (state: State) => state.status.notificationSwitch,
    );
    const voiceSwitch = useSelector((state: State) => state.status.voiceSwitch);
    const selfVoiceSwitch = useSelector(
        (state: State) => state.status.selfVoiceSwitch,
    );
    const sound = useSelector((state: State) => state.status.sound);
    const theme = useSelector((state: State) => state.status.theme);
    const primaryColor = useSelector(
        (state: State) => state.status.primaryColor,
    );
    const primaryTextColor = useSelector(
        (state: State) => state.status.primaryTextColor,
    );
    const backgroundImage = useSelector(
        (state: State) => state.status.backgroundImage,
    );
    const aero = useSelector((state: State) => state.status.aero);
    const userId = useSelector((state: State) => state.user?._id);
    const tagColorMode = useSelector(
        (state: State) => state.status.tagColorMode,
    );
    const enableSearchExpression = useSelector(
        (state: State) => state.status.enableSearchExpression,
    );

    const [backgroundLoading, toggleBackgroundLoading] = useState(false);

    function setTheme(themeName: string) {
        action.setStatus('theme', themeName);
        // @ts-ignore
        const themeConfig = themes[themeName];
        if (themeConfig) {
            action.setStatus('primaryColor', themeConfig.primaryColor);
            action.setStatus('primaryTextColor', themeConfig.primaryTextColor);
            action.setStatus('backgroundImage', themeConfig.backgroundImage);
            action.setStatus('aero', themeConfig.aero);
            setCssVariable(
                themeConfig.primaryColor,
                themeConfig.primaryTextColor,
            );
            window.localStorage.removeItem(LocalStorageKey.PrimaryColor);
            window.localStorage.removeItem(LocalStorageKey.PrimaryTextColor);
            window.localStorage.removeItem(LocalStorageKey.BackgroundImage);
            window.localStorage.removeItem(LocalStorageKey.Aero);
            Message.success('Chủ đề đã được sửa đổi');
        } else {
            window.localStorage.setItem(
                LocalStorageKey.PrimaryColor,
                primaryColor,
            );
            window.localStorage.setItem(
                LocalStorageKey.PrimaryTextColor,
                primaryTextColor,
            );
            window.localStorage.setItem(
                LocalStorageKey.BackgroundImage,
                backgroundImage,
            );
            window.localStorage.setItem(LocalStorageKey.Aero, aero.toString());
        }
    }

    function handleSelectSound(newSound: string) {
        playSound(newSound);
        action.setStatus('sound', newSound);
    }

    async function selectBackgroundImage() {
        toggleBackgroundLoading(true);
        try {
            const image = await readDiskFile(
                'blob',
                'image/png,image/jpeg,image/gif',
            );
            if (!image) {
                return;
            }
            if (image.length > config.maxBackgroundImageSize) {
                // eslint-disable-next-line consistent-return
                return Message.error('Không đặt được hình nền, Vui lòng chọn hình ảnh nhỏ hơn 3MB');
            }
            const imageUrl = await uploadFile(
                image.result as Blob,
                `BackgroundImage/${userId}_${Date.now()}.${image.ext}`,
            );
            action.setStatus('backgroundImage', imageUrl);
        } finally {
            toggleBackgroundLoading(false);
        }
    }

    function handlePrimaryColorChange(color: Color) {
        const newPrimaryColor = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
        action.setStatus('primaryColor', newPrimaryColor);
        setCssVariable(newPrimaryColor, primaryTextColor);
    }

    function handlePrimaryTextColorChange(color: Color) {
        const mewPrimaryTextColor = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
        action.setStatus('primaryTextColor', mewPrimaryTextColor);
        setCssVariable(primaryColor, mewPrimaryTextColor);
    }

    return (
        <Dialog
            className={`dialog ${Style.setting}`}
            visible={visible}
            onClose={onClose}
        >
            <Tabs
                defaultActiveKey="default"
                renderTabBar={() => <ScrollableInkTabBar />}
                renderTabContent={() => <TabContent />}
            >
                <TabPane tab="Chức năng" key="function">
                    <div
                        className={`${Common.container} ${Style.scrollContainer}`}
                    >
                        <div className={Common.block}>
                            <p className={Common.title}>Chức năng</p>
                            <div className={Style.switchContainer}>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>Âm thanh nhắc nhở</p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'soundSwitch',
                                                value,
                                            )
                                        }
                                        checked={soundSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>Lời nhắc trên màn hình</p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'notificationSwitch',
                                                value,
                                            )
                                        }
                                        checked={notificationSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>Phát sóng bằng giọng nói</p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'voiceSwitch',
                                                value,
                                            )
                                        }
                                        checked={voiceSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>
                                        Phát sóng tin tức của riêng bạn
                                    </p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'selfVoiceSwitch',
                                                value,
                                            )
                                        }
                                        checked={selfVoiceSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>
                                        Đề xuất biểu tượng cảm xúc dựa trên nội dung đầu vào
                                    </p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'enableSearchExpression',
                                                value,
                                            )
                                        }
                                        checked={enableSearchExpression}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={Common.block}>
                            <p className={Common.title}>Âm thanh trình chiếu</p>
                            <div>
                                <RadioGroup
                                    className={Style.radioGroup}
                                    value={sound}
                                    onChange={handleSelectSound}
                                    horizontal
                                >
                                    <RadioButton value="default">
                                        Mặc định
                                    </RadioButton>
                                    <RadioButton value="apple">
                                        Quả táo
                                    </RadioButton>
                                    <RadioButton value="pcqq">
                                        QQ máy tính
                                    </RadioButton>
                                    <RadioButton value="mobileqq">
                                        QQ di động
                                    </RadioButton>
                                    <RadioButton value="momo">Momo</RadioButton>
                                    <RadioButton value="huaji">
                                        Buồn cười
                                    </RadioButton>
                                </RadioGroup>
                            </div>
                        </div>
                        <div className={Common.block}>
                            <p className={Common.title}>Màu nhãn</p>
                            <div>
                                <RadioGroup
                                    className={Style.TagModeRadioGroup}
                                    value={tagColorMode}
                                    onChange={(newValue: string) =>
                                        action.setStatus(
                                            'tagColorMode',
                                            newValue,
                                        )
                                    }
                                    horizontal
                                >
                                    <RadioButton value="singleColor">
                                        Màu đơn
                                    </RadioButton>
                                    <RadioButton value="fixedColor">
                                        Màu cố định
                                    </RadioButton>
                                    <RadioButton value="randomColor">
                                        Màu sắc ngẫu nhiên
                                    </RadioButton>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>
                </TabPane>
                <TabPane tab="Chủ đề" key="theme">
                    <div
                        className={`${Common.container} ${Style.scrollContainer}`}
                    >
                        <div className={Common.block}>
                            <div>
                                <RadioGroup
                                    className={Style.TagModeRadioGroup}
                                    value={theme}
                                    onChange={(newValue: string) =>
                                        setTheme(newValue)
                                    }
                                    horizontal
                                >
                                    <RadioButton value="default">
                                        Mặc định
                                    </RadioButton>
                                    <RadioButton value="cool">Làm mới</RadioButton>
                                    <RadioButton value="custom">
                                        Tùy chỉnh
                                    </RadioButton>
                                </RadioGroup>
                            </div>
                        </div>
                        {theme === 'custom' && (
                            <>
                                <div className={Common.block}>
                                    <p className={Common.title}>Hiệu ứng kính mờ</p>
                                    <div>
                                        <Switch
                                            onChange={(value) =>
                                                action.setStatus('aero', value)
                                            }
                                            checked={aero}
                                        />
                                    </div>
                                </div>
                                <div className={Common.block}>
                                    <p className={Common.title}>
                                        Hình nền{' '}
                                        <span className={Style.backgroundTip}>
                                            Hình nền sẽ được kéo dài theo kích thước của cửa sổ trình duyệt,
                                            Tỷ lệ hợp lý sẽ đạt kết quả tốt hơn
                                        </span>
                                    </p>
                                    <div
                                        className={
                                            Style.backgroundImageContainer
                                        }
                                    >
                                        <img
                                            className={`${
                                                Style.backgroundImage
                                            } ${
                                                backgroundLoading ? 'blur' : ''
                                            }`}
                                            src={getOSSFileUrl(backgroundImage)}
                                            alt="Xem trước ảnh nền"
                                            onClick={selectBackgroundImage}
                                        />
                                        <ReactLoading
                                            className={`${
                                                Style.backgroundImageLoading
                                            } ${
                                                backgroundLoading
                                                    ? 'show'
                                                    : 'hide'
                                            }`}
                                            type="spinningBubbles"
                                            color={`rgb(${primaryColor}`}
                                            height={100}
                                            width={100}
                                        />
                                    </div>
                                </div>
                                {TwitterPicker && (
                                    <div className={Common.block}>
                                        <p className={Common.title}>Màu chủ đề</p>
                                        <div className={Style.colorInfo}>
                                            <div
                                                style={{
                                                    backgroundColor: `rgb(${primaryColor})`,
                                                }}
                                            />
                                            <span>{`rgb(${primaryColor})`}</span>
                                        </div>
                                        <TwitterPicker
                                            // @ts-ignore
                                            className={Style.colorPicker}
                                            color={`rgb(${primaryColor})`}
                                            onChange={handlePrimaryColorChange}
                                        />
                                    </div>
                                )}
                                {TwitterPicker && (
                                    <div className={Common.block}>
                                        <p className={Common.title}>Văn bản màu</p>
                                        <div className={Style.colorInfo}>
                                            <div
                                                style={{
                                                    backgroundColor: `rgb(${primaryTextColor})`,
                                                }}
                                            />
                                            <span>{`rgb(${primaryTextColor})`}</span>
                                        </div>
                                        <TwitterPicker
                                            // @ts-ignore
                                            className={Style.colorPicker}
                                            color={`rgb(${primaryTextColor})`}
                                            onChange={
                                                handlePrimaryTextColorChange
                                            }
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </TabPane>
            </Tabs>
        </Dialog>
    );
}

export default Setting;
