import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const AIMessageCard = ({ data, selectedSchedule, setSelectedSchedule }) => {

  const schedules = data?.schedules ?? [];

  return (
    <View style={{ padding: 10 }}>
      {schedules.map(s => {

        const isSelected = selectedSchedule?.id === s.id;

        return (
          <TouchableOpacity
            key={s.id}
            onPress={() => setSelectedSchedule(s)}
          >
            <View style={{
              marginBottom: 10,
              borderWidth: isSelected ? 2 : 0,
              borderColor: isSelected ? '#6C5CE7' : 'transparent',
              borderRadius: 10,
              padding: 5
            }}>

              {/* 🔥 제목 안에 포함 */}
              <Text style={{ fontWeight: 'bold' }}>
                {isSelected ? `AI 추천 ${s.title}` : s.title}
              </Text>

              <Text>{s.description}</Text>

            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default AIMessageCard;