import { View, Text } from 'native-base';
import React from 'react';
import { StyleSheet } from 'react-native';
import Dialog from 'react-native-dialog';

type Props = {
    visible: boolean;
    onClose: () => void;
    onOK: () => void;
};

function Sponsor({ visible, onClose, onOK }: Props) {
    return (
        <Dialog.Container visible={visible}>
            <Dialog.Title>Nhà tài trợ</Dialog.Title>
            <Dialog.Description>
                <View>
                    <Text style={styles.text}>
                        Nếu bạn thấy phòng chat này tốt thì mong bạn tài trợ cho nó nhé~~
                    </Text>
                    <Text style={styles.tip}>
                        Vui lòng điền số tài khoản fiora của bạn vào phần nhận xét chuyển khoản
                    </Text>
                </View>
            </Dialog.Description>
            <Dialog.Button label="Khép kín" onPress={onClose} />
            <Dialog.Button label="Nhà tài trợ" onPress={onOK} />
        </Dialog.Container>
    );
}

export default Sponsor;

const styles = StyleSheet.create({
    text: {
        fontSize: 14,
        color: '#333',
        marginTop: 16,
    },
    tip: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 12,
    },
});
