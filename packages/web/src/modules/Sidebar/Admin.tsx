import React, { useEffect, useState } from 'react';

import { css } from 'linaria';
import Style from './Admin.less';
import Common from './Common.less';
import Dialog from '../../components/Dialog';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Message from '../../components/Message';
import {
    getSealList,
    resetUserPassword,
    sealUser,
    setUserTag,
    sealIp,
    toggleSendMessage,
    toggleNewUserSendMessage,
    getSystemConfig,
} from '../../service';

const styles = {
    button: css`
        min-width: 100px;
        height: 36px;
        margin-right: 12px;
        padding: 0 10px;
    `,
};

type SystemConfig = {
    disableSendMessage: boolean;
    disableNewUserSendMessage: boolean;
};

interface AdminProps {
    visible: boolean;
    onClose: () => void;
}

function Admin(props: AdminProps) {
    const { visible, onClose } = props;

    const [tagUsername, setTagUsername] = useState('');
    const [tag, setTag] = useState('');
    const [resetPasswordUsername, setResetPasswordUsername] = useState('');
    const [sealUsername, setSealUsername] = useState('');
    const [sealList, setSealList] = useState({ users: [], ips: [] });
    const [sealIpAddress, setSealIpAddress] = useState('');
    const [systemConfig, setSystemConfig] = useState<SystemConfig>();

    async function handleGetSealList() {
        const sealListRes = await getSealList();
        if (sealListRes) {
            setSealList(sealListRes);
        }
    }
    async function handleGetSystemConfig() {
        const systemConfigRes = await getSystemConfig();
        if (systemConfigRes) {
            setSystemConfig(systemConfigRes);
        }
    }
    useEffect(() => {
        if (visible) {
            handleGetSystemConfig();
            handleGetSealList();
        }
    }, [visible]);

    /**
     * 处理更新用户标签
     */
    async function handleSetTag() {
        const isSuccess = await setUserTag(tagUsername, tag.trim());
        if (isSuccess) {
            Message.success('Cập nhật biệt danh người dùng thành công, Vui lòng làm mới trang để cập nhật dữ liệu');
            setTagUsername('');
            setTag('');
        }
    }

    /**
     * 处理重置用户密码操作
     */
    async function handleResetPassword() {
        const res = await resetUserPassword(resetPasswordUsername);
        if (res) {
            Message.success(`Mật khẩu của người dùng này đã được đặt lại thành:${res.newPassword}`);
            setResetPasswordUsername('');
        }
    }
    /**
     * 处理封禁用户操作
     */
    async function handleSeal() {
        const isSuccess = await sealUser(sealUsername);
        if (isSuccess) {
            Message.success('Người dùng đã bị cấm thành công');
            setSealUsername('');
            handleGetSealList();
        }
    }

    async function handleSealIp() {
        const isSuccess = await sealIp(sealIpAddress);
        if (isSuccess) {
            Message.success('IP bị cấm thành công');
            setSealIpAddress('');
            handleGetSealList();
        }
    }

    async function handleDisableSendMessage() {
        const isSuccess = await toggleSendMessage(false);
        if (isSuccess) {
            Message.success('Kích hoạt lệnh cấm thành công');
            handleGetSystemConfig();
        }
    }
    async function handleEnableSendMessage() {
        const isSuccess = await toggleSendMessage(true);
        if (isSuccess) {
            Message.success('Đóng lệnh cấm thành công');
            handleGetSystemConfig();
        }
    }

    async function handleDisableSNewUserendMessage() {
        const isSuccess = await toggleNewUserSendMessage(false);
        if (isSuccess) {
            Message.success('Lệnh cấm người dùng mới được kích hoạt thành công');
            handleGetSystemConfig();
        }
    }
    async function handleEnableNewUserSendMessage() {
        const isSuccess = await toggleNewUserSendMessage(true);
        if (isSuccess) {
            Message.success('Lệnh cấm người dùng mới đã được đóng thành công');
            handleGetSystemConfig();
        }
    }

    return (
        <Dialog
            className={Style.admin}
            visible={visible}
            title="Bảng điều khiển dành cho quản trị viên"
            onClose={onClose}
        >
            <div className={Common.container}>
                <div className={Common.block}>
                    {!systemConfig?.disableSendMessage ? (
                        <Button
                            className={styles.button}
                            type="danger"
                            onClick={handleDisableSendMessage}
                        >
                            Bật lệnh cấm
                        </Button>
                    ) : (
                        <Button
                            className={styles.button}
                            onClick={handleEnableSendMessage}
                        >
                            Đóng lệnh cấm
                        </Button>
                    )}
                    {!systemConfig?.disableNewUserSendMessage ? (
                        <Button
                            className={styles.button}
                            type="danger"
                            onClick={handleDisableSNewUserendMessage}
                        >
                            Kích hoạt lệnh cấm người dùng mới
                        </Button>
                    ) : (
                        <Button
                            className={styles.button}
                            onClick={handleEnableNewUserSendMessage}
                        >
                            Đóng lệnh cấm người dùng mới
                        </Button>
                    )}
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Cập nhật biệt danh người dùng</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={`${Style.input} ${Style.tagUsernameInput}`}
                            value={tagUsername}
                            onChange={setTagUsername}
                            placeholder="Tên người dùng để cập nhật nhãn"
                        />
                        <Input
                            className={`${Style.input} ${Style.tagInput}`}
                            value={tag}
                            onChange={setTag}
                            placeholder="Nội dung nhãn"
                        />
                        <Button className={Style.button} onClick={handleSetTag}>
                            Chắc chắn
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Đặt lại mật khẩu người dùng</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={resetPasswordUsername}
                            onChange={setResetPasswordUsername}
                            placeholder="Tên người dùng để đặt lại mật khẩu"
                        />
                        <Button
                            className={Style.button}
                            onClick={handleResetPassword}
                        >
                            Chắc chắn
                        </Button>
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>Cấm người dùng</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={sealUsername}
                            onChange={setSealUsername}
                            placeholder="Tên người dùng bị cấm"
                        />
                        <Button className={Style.button} onClick={handleSeal}>
                            Chắc chắn
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Danh sách người dùng bị cấm</p>
                    <div className={Style.sealList}>
                        {sealList.users.map((username) => (
                            <span className={Style.sealUsername} key={username}>
                                {username}
                            </span>
                        ))}
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>Cấm ip</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={sealIpAddress}
                            onChange={setSealIpAddress}
                            placeholder="IP bị cấm"
                        />
                        <Button className={Style.button} onClick={handleSealIp}>
                            Chắc chắn
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Danh sách ip bị cấm</p>
                    <div className={Style.sealList}>
                        {sealList.ips.map((ip) => (
                            <span className={Style.sealUsername} key={ip}>
                                {ip}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default Admin;
