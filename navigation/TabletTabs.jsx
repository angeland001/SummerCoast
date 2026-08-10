import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen from '../screens/MainScreen';
import System from '../screens/System';
import Settings from '../screens/Settings';
import Vents from '../screens/Vents';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import LightScreenTablet from '../screens/LightScreenTablet';
import ClimateControl from '../screens/ClimateControlScreenTablet';
const Tab = createBottomTabNavigator();

const screenOptions = (route, color) => {
  let iconName;

  switch (route.name) {
    case 'Home':
      iconName = 'home';
      break;
    case 'Lights':
      iconName = 'bulb1';
      break;
    case 'Air Conditioning':
      iconName = 'API';
      break;
    case 'Vents':
      iconName = 'cloudo';
      break;
    case 'Victron':
      iconName = 'hdd'
      break;
    case 'Settings':
      iconName = 'setting';
      break;
    
    default:
      iconName = 'question';
  }

  return (
    <Icon
      name={iconName}
      color={color}
      size={24}
      style={{ marginTop: 2 }} // Lower the icon
    />
  );
};

const TabletTabs = () => {
  return (
    <View style={styles.container}>
      <Tab.Navigator
  screenOptions={({ route }) => ({
    tabBarStyle: styles.tabBar,
    tabBarActiveTintColor: '#FFB267',
    tabBarInactiveTintColor: '#FFFFFF',
    tabBarIcon: ({ color }) => (
      <View style={styles.iconContainer}>
        {screenOptions(route, color)}
      </View>
    ),
    tabBarShowLabel: false, // Disable the label names
    headerShown: false,
  })}
>

        <Tab.Screen name="Home" component={MainScreen} />
        <Tab.Screen name="Lights" component={LightScreenTablet} />
        <Tab.Screen name="Air Conditioning" component={ClimateControl} />
        <Tab.Screen name="Vents" component={Vents}/>
        <Tab.Screen name="Victron" component={System} />
        <Tab.Screen name="Settings" component={Settings} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10, // Add space on the sides
    backgroundColor: '#000', // Optional background color
  },
  tabBar: {
    backgroundColor: '#242124',
    borderRadius: 15, // Rounded corners
    marginHorizontal: 20, // Ensure it doesn't touch screen edges
    marginBottom: 10, // Space from bottom of the screen
    
    
    height: 63, // Adjust height as needed
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    
  },
});


export default TabletTabs;