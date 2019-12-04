import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Permissions from 'expo-permissions';
import * as firebase from 'firebase/app';
import 'firebase/storage';
import 'firebase/firestore';

import config from './config';

firebase.initializeApp(config);

export default class App extends React.Component {
  state = {
    image: '',
    data: [],
    uploading: false
  };

  async componentDidMount() {
    this.getPermissionAsync();
    // Getting the images urls from the db
    const snapshot = await firebase
      .firestore()
      .collection('posts')
      .get();
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    this.setState({ data });
  }

  uploadImage = async () => {
    this.setState({ uploading: true });
    try {
      // Creating a blob from the selected image
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
          resolve(xhr.response);
        };
        xhr.onerror = function() {
          reject(new TypeError('Network request failed'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', this.state.image, true);
        xhr.send(null);
      });

      // Making a file name
      const ext = this.state.image.split('.').pop();
      const fileName = `${new Date()}.${ext}`;
      // Uploading the image to firebase storage
      const snapshot = await firebase
        .storage()
        .ref(`images/${fileName}`)
        .put(blob);

      const url = await snapshot.ref.getDownloadURL();
      // when we're done sending it, close and release the blob
      blob.close();
      await firebase
        .firestore()
        .collection('posts')
        .doc()
        .set({
          imageUrl: url
        });

      this.setState({ uploading: false });

      // Getting the images urls from the db
      const dataSnapshot = await firebase
        .firestore()
        .collection('posts')
        .get();
      const data = [];
      dataSnapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      this.setState({ data });
    } catch (error) {
      console.log(error);
    }
  };

  getPermissionAsync = async () => {
    const { status } = await Permissions.askAsync(
      Permissions.CAMERA,
      Permissions.CAMERA_ROLL
    );
    if (status !== 'granted') {
      alert('you might need to enable camera permissions');
    }
  };

  imagePicker = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All // allowing all media types
    });

    if (!result.cancelled) {
      this.setState({ image: result.uri });
      this.uploadImage();
    }
  };

  takeImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All
    });

    if (!result.cancelled) {
      this.setState({ image: result.uri });
      this.uploadImage();
    }
  };

  render() {
    const { uploading, data } = this.state;
    return (
      <>
        <View style={styles.container}>
          <ScrollView>
            {uploading ? (
              <Text>Uploading....</Text>
            ) : (
              <>
                <View style={styles.form}>
                  <Button
                    style={styles.button}
                    onPress={this.imagePicker}
                    title="Select A Photo"
                    color="#841584"
                    accessibilityLabel="select a photo by pressing this button"
                  />
                  <Button
                    style={styles.button}
                    onPress={this.takeImage}
                    title="Take A Photo"
                    color="#841584"
                    accessibilityLabel="select a photo by pressing this button"
                  />
                </View>
                <View style={styles.posts}>
                  {data &&
                    data.map(post => (
                      <Image
                        key={post.id}
                        source={{ uri: post.imageUrl }}
                        style={styles.post}
                      />
                    ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  posts: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20
  },
  form: {
    width: '80%',
    height: '20%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20
  },
  button: {
    marginTop: 20
  },
  post: { height: 200, width: 200 }
});
