import React, { useState } from 'react';
import platform from 'platform';
import { useDispatch } from 'react-redux';

import getFriendId from '@fiora/utils/getFriendId';
import convertMessage from '@fiora/utils/convertMessage';
import Input from '../../components/Input';
import useAction from '../../hooks/useAction';

import Style from './LoginRegister.less';
import { login, getLinkmansLastMessagesV2 } from '../../service';
import { Message } from '../../state/reducer';
import { ActionTypes } from '../../state/action';

/** 登录框 */
function Login() {
    const action = useAction();
    const dispatch = useDispatch();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    async function handleLogin() {
        const user = await login(
            username,
            password,
            platform.os?.family,
            platform.name,
            platform.description,
        );
        if (user) {
            action.setUser(user);
            action.toggleLoginRegisterDialog(false);
            window.localStorage.setItem('token', user.token);

            const linkmanIds = [
                ...user.groups.map((group: any) => group._id),
                ...user.friends.map((friend: any) =>
                    getFriendId(friend.from, friend.to._id),
                ),
            ];
            const linkmanMessages = await getLinkmansLastMessagesV2(linkmanIds);
            Object.values(linkmanMessages).forEach(
                // @ts-ignore
                ({ messages }: { messages: Message[] }) => {
                    messages.forEach(convertMessage);
                },
            );
            dispatch({
                type: ActionTypes.SetLinkmansLastMessages,
                payload: linkmanMessages,
            });
        }
    }

    return (
        <div className={Style.loginRegister}>
            <h3 className={Style.title}>Tên tài khoản</h3>
            <Input
                className={Style.input}
                value={username}
                onChange={setUsername}
                onEnter={handleLogin}
            />
            <h3 className={Style.title}>Mật khẩu</h3>
            <Input
                className={Style.input}
                type="password"
                value={password}
                onChange={setPassword}
                onEnter={handleLogin}
            />
            <button
                className={Style.button}
                onClick={handleLogin}
                type="button"
            >
                Đăng nhập
            </button>
        </div>
    );
}

export default Login;
