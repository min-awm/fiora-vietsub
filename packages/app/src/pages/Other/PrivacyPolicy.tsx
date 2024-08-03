import { Text } from 'native-base';
import React from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';
import Dialog from 'react-native-dialog';
import { removeStorageValue, setStorageValue } from '../../utils/storage';

export const PrivacyPolicyStorageKey = 'privacy-policy';

type Props = {
    visible: boolean;
    onClose: () => void;
};

function PrivacyPolicy({ visible, onClose }: Props) {
    function handleClickPrivacyPolicy() {
        Linking.openURL('https://fiora.suisuijiang.com/PrivacyPolicy.html');
    }

    async function handleAgree() {
        await setStorageValue(PrivacyPolicyStorageKey, 'true');
        onClose();
    }

    async function handleDisagree() {
        await removeStorageValue(PrivacyPolicyStorageKey);
        onClose();
    }

    return (
        <Dialog.Container visible={visible}>
            <Dialog.Title>Thỏa thuận dịch vụ và Chính sách quyền riêng tư</Dialog.Title>
            <Dialog.Description style={styles.container}>
                Chào mừng fiora
                APP。Chúng tôi rất coi trọng việc bảo vệ thông tin cá nhân và quyền riêng tư của bạn. Vui lòng đọc kỹ trước khi sử dụng.
                <TouchableOpacity onPress={handleClickPrivacyPolicy}>
                    <Text style={styles.text}>《Chính sách bảo mật》</Text>
                </TouchableOpacity>
                ，và hiểu đầy đủ các điều khoản của thỏa thuận. Chúng tôi sẽ sử dụng thông tin cá nhân của bạn theo đúng các điều khoản bạn đồng ý để cung cấp cho bạn những dịch vụ tốt hơn.
            </Dialog.Description>
            <Dialog.Button label="Không đồng ý" onPress={handleDisagree} />
            <Dialog.Button label="Đồng ý" onPress={handleAgree} />
        </Dialog.Container>
    );
}

export default PrivacyPolicy;

const styles = StyleSheet.create({
    container: {
        textAlign: 'left',
    },
    text: {
        fontSize: 12,
        color: '#2a7bf6',
    },
});
