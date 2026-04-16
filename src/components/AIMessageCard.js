import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const AIMessageCard = ({ data, onSelectSchedule }) => {

  return (
    <View style={{ padding: 10 }}>

      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
        추천 일정
      </Text>

      {data.schedule.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onSelectSchedule(item)} // 선택 이벤트
          style={{
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 10,
            marginBottom: 10,
            elevation: 2
          }}
        >
          <Text>{item}</Text>
        </TouchableOpacity>
      ))}

    </View>
  );
};

export default AIMessageCard;