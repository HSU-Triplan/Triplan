import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const AIMessageCard = ({ data, onSelectSchedule }) => {

  return (
    <View style={{ padding: 10 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
        추천 일정
      </Text>

      {data.schedules.map((schedule) => (
        <TouchableOpacity
          key={schedule.id}
          onPress={() => onSelectSchedule(schedule)}
          style={{
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 10,
            marginBottom: 10
          }}
        >
          <Text style={{ fontWeight: 'bold' }}>
            {schedule.title}
          </Text>
          <Text>{schedule.description}</Text>
        </TouchableOpacity>
      ))}

    </View>
  );
};

export default AIMessageCard;