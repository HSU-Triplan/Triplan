import { View,Text} from 'react-native';
const AIMessageCard = ({ data }) => (
  <View style={{
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 10,
    margin: 5
  }}>
    <Text>📍 추천 여행지</Text>
    {data.locations.map((l, i) => <Text key={i}>• {l}</Text>)}

    <Text>🗓 일정</Text>
    {data.schedule.map((s, i) => <Text key={i}>{s}</Text>)}
  </View>
);

export default AIMessageCard;