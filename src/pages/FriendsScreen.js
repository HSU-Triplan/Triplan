import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
  TextInput,
  Switch,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useRef } from 'react';

export default function FriendsScreen({ setIsLoggedIn }) {
    const [screen, setScreen] = useState('friends');
    const isUploadingRef = useRef(false);
    const [friendsList,setFriendsList] = useState(null);
    const [requestList,setRequestList] = useState(null);
     const [friendCode,setFriendCode] = useState('');
     const [selection,setSelection] = useState("friendsList");


    //친구 목록 가져오기
    useFocusEffect(
      React.useCallback(() => {
        if (isUploadingRef.current) return;
        const loadUserInfo = async () => {
          try {
            const token = await AsyncStorage.getItem('token');

            const response = await fetch('http://10.0.2.2:3000/users/friends', {
              headers: { Authorization: `Bearer ${token}` },
            });

            const result = await response.json();

            if (result.success && !isUploadingRef.current) {
                let friends = []
                let request = []
                for(let i = 0 ; i < result.friends.length;i++){
                    if(result.friends[i].status == 'accept'){
                        friends.push(result.friends[i])
                    }else if(result.friends[i].status == 'request'){
                        request.push(result.friends[i])
                    }
                }
                setFriendsList(friends)
                setRequestList(request)
            }
          }
          catch (e) {
            console.log('친구 정보 불러오기 실패:', e);
          }
        };
        loadUserInfo();
      }, [])
    );

    //친구 추가 함수
    const friendAdd = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch('http://10.0.2.2:3000/users/friendsAdd?friendCode='+friendCode, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

    }
    catch (e) {
      console.log('친구 정보 불러오기 실패:', e);
    }
  }

  //친구 요청 수락 함수
  const friendAccept = async (request) => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log(request.users.id)
        const response = await fetch('http://10.0.2.2:3000/users/friendsAccept?friendId='+request.users.id, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      catch (e) {
        console.log('친구 요청 수락 실패:', e);
      }
    }

 //친구 요청 거절 함수
  const friendRefuse = async (request) => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log(request.users.id)
        const response = await fetch('http://10.0.2.2:3000/users/friendsRefuse?friendId='+request.users.id, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      catch (e) {
        console.log('친구 요청 거절 실패:', e);
      }
    }

  return (
    <View style={{ flex: 1 }}>

          {/* 앱바 */}
          <View style={styles.appBar}>
          <TouchableOpacity style={[(selection == "friendsList") ? styles.selectedAppBarButton : styles.appBarButton]}
            onPress={() =>
                {
                    setSelection("friendsList")
                    setScreen('friends')
                }
            }>
            <Text style={styles.title}>친구</Text>
          </TouchableOpacity>
           <TouchableOpacity style={[(selection == "requestList") ? styles.selectedAppBarButton : styles.appBarButton]}
                onPress={() => {
                     setSelection("requestList")
                    setScreen('request')}
           }>
                <Text style={styles.title}>받은요청</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[(selection == "add") ? styles.selectedAppBarButton : styles.appBarButton]}
                onPress={() => {
                    setSelection("add")
                    setScreen('add')
                }
           }>
                <Text style={styles.title}>친구추가</Text>
          </TouchableOpacity>
          </View>

          {/* 내용 */}
          <View style={{ flex: 1 }}>
            {screen === "friends" &&
                (
                <ScrollView>
                    <Text style={styles.friendsCount}>친구 {friendsList?.length}</Text>
                        {friendsList?.map((friend,index) =>
                        (
                            <View key = {index} style={styles.friendsList}>
                                <Image style={styles.profileImage}
                                    source={{uri:friend.users.profile_image}}/>
                                <Text style={styles.friendName}>{friend.users.name}</Text>

                            </View>
                        )
                    )}
                </ScrollView>
              )
            }
             {screen === "request" &&  (
              <ScrollView>
                  <Text style={styles.friendsCount}>받은요청 {requestList?.length}</Text>
                      {requestList?.map((friend,index) =>
                      (
                          <View key = {index} style={styles.friendsList}>
                              <Image style={styles.profileImage}
                                  source={{uri:friend.users.profile_image}}/>
                              <Text style={styles.friendName}>{friend.users.name}</Text>
                              <View style={styles.btn}>
                                <TouchableOpacity onPress = {()=>friendAccept(requestList[index])}
                                    style={styles.acceptBtn}><Text style={{color:'#ffffff'}}>수락</Text></TouchableOpacity>
                                <TouchableOpacity onPress = {()=>friendRefuse(requestList[index])}
                                    style={styles.refuseBtn}><Text style={{color:'#ffffff'}}>거절</Text></TouchableOpacity>
                            </View>
                          </View>
                      )
                  )}
              </ScrollView>
            )}
              {screen === "add" && (
              <View>
                <Text style={styles.friendsCount}>친구 코드 입력</Text>
                    <TextInput value = {friendCode} onChangeText = {setFriendCode} onSubmitEditing ={(event) => {
                        friendAdd()
                    }} style={styles.friendCodeInput}></TextInput>

              </View>
              )}
          </View>

    </View>
  );
}

const styles = StyleSheet.create({
    appBar: {
        height: 60,
        backgroundColor: '#ffffff',
        flexDirection : 'row',
        justifyContent: 'flex-start',
         alignItems:'center',


        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },

    appBarButton : {
        borderWidth : 1,
        borderColor : '#ddd',
        borderRadius: 20,
        width : 70,
        height : 40,
        justifyContent : 'center',
        alignItems:'center',
        margin : 3

    },

    selectedAppBarButton : {
            borderWidth : 1,
            borderColor : '#5296F5',
            backgroundColor : '#5296F5',
            borderRadius: 20,
            width : 70,
            height : 40,
            justifyContent : 'center',
            alignItems:'center',
            margin : 3

    },

    title: {
        fontSize: 17,
        fontWeight: 'bold',
    },

    friendsList : {
        flexDirection : 'row',
        marginLeft : 10,
        marginTop : 20,
    },
    profileImage : {
        width:50,
        height:50,
        borderRadius : 25
    },
    friendsCount:{
         marginLeft : 10,
          marginTop : 20
    },
    friendName:{
         marginLeft : 10,
         fontWeight : "bold"
    },
    friendCodeInput :{
        marginTop : 10,
        marginLeft : 10,
        borderWidth : 1,
        width : 100,
        height : 60,
        color : 'black'
    },
    btn : {
        marginLeft : 'auto',
        flexDirection : 'row',
        alignItems : 'center'
    },
    acceptBtn : {
        borderWidth : 1,
        marginRight : 10,
        borderColor : '#7EC8FF',
        backgroundColor : '#7EC8FF',

    },
    refuseBtn : {
        borderWidth : 1,

        borderColor : '#ff0000',
        backgroundColor : '#ff0000',
    }
});