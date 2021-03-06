import React from 'react'
import PropTypes from 'prop-types'
import {StyleSheet, Dimensions, Keyboard, TouchableOpacity, Alert, Image, FlatList, ActivityIndicator, View, Platform} from 'react-native'
import Icon from '../../Icon'
import { materialTheme } from '../../../constants'
import { Input, Block, Button, theme } from 'galio-framework'
import EmojiSelector, { Categories } from 'react-native-emoji-selector'
import * as DocumentPicker from 'expo-document-picker'
import Tabs from '../../ButtonTabs'
import * as mime from 'react-native-mime-types'
import * as Permissions from 'expo-permissions'
import * as FileSystem from 'expo-file-system'
import { Audio } from 'expo-av'
import StickerMenu from '../../StickerPicker/stickers'
import ATTACHMENTSMODAL from './attachmentsModal'
const { width } = Dimensions.get('screen')
import { Text } from 'react-native-elements';
import Popover from 'react-native-popover-view';

let Toast = null
if (Platform.OS === 'ios') {
  Toast = require('react-native-tiny-toast')
} else {
  Toast = require('react-native-simple-toast')
}

class Footer extends React.Component {
  constructor (props, context) {
    super(props, context)
    this.recording = null
    this.state = {
      text: '',
      attachment: {},
      componentType: '',
      gif: '',
      sticker: '',
      urlmeta: {},
      uploadingFile: false,
      uploaded: false,
      loading: false,
      loadingUrlMeta: false,
      currentUrl: '',
      showAudioRecording: false,
      showPickers: false,
      selectedPicker: '',
      isRecording: false,
      isLoading: false,
      recordingDuration: null,
      recordingPermissionGranted: false,
      gifSearchValue: '',
      gifs: [],
      loadingGif: false,
      showAttachmentsModal: false,
      galleryPermission: false,
      showPopover: false,
      suggestionShown: false
    }

    this.recordingSettings = Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
    this.recordingSettings.ios.outputFormat = Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC
    this.recordingSettings.ios.extension = '.m4a'
    // this.recordingSettings.ios = {
    //   extension: '.m4a',
    //   outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_APPLELOSSLESS,
    //   audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MIN,
    //   sampleRate: 44100,
    //   numberOfChannels: 2,
    //   bitRate: 128000,
    //   linearPCMBitDepth: 16,
    //   linearPCMIsBigEndian: false,
    //   linearPCMIsFloat: false
    // }
    this.onInputChange = this.onInputChange.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
    this.setDataPayload = this.setDataPayload.bind(this)
    this.updateChatData = this.updateChatData.bind(this)
    this.changeTab = this.changeTab.bind(this)
    this.showPickers = this.showPickers.bind(this)
    this.setEmoji = this.setEmoji.bind(this)
    this.hidePickers = this.hidePickers.bind(this)
    this.selectAttachment = this.selectAttachment.bind(this)
    this.getComponentType = this.getComponentType.bind(this)
    this.removeAttachment = this.removeAttachment.bind(this)
    this.onAttachmentUpload = this.onAttachmentUpload.bind(this)
    this.handleMessageResponse = this.handleMessageResponse.bind(this)
    this.onRecordPress = this.onRecordPress.bind(this)
    this._stopRecording = this._stopRecording.bind(this)
    this._updateScreenForRecordingStatus = this._updateScreenForRecordingStatus.bind(this)
    this._beginRecording = this._beginRecording.bind(this)
    this._getMMSSFromMillis = this._getMMSSFromMillis.bind(this)
    this._getRecordingTimestamp = this._getRecordingTimestamp.bind(this)
    this.sendSticker = this.sendSticker.bind(this)
    this.fetchGifs = this.fetchGifs.bind(this)
    this.sendGif = this.sendGif.bind(this)
    this.changeGifSearchValue = this.changeGifSearchValue.bind(this)
    this.addNewLine = this.addNewLine.bind(this)
    this.setAttachmentsModal = this.setAttachmentsModal.bind(this)
    this.setGalleryPermission = this.setGalleryPermission.bind(this)
    this.uploadAttachment = this.uploadAttachment.bind(this)
    this.sendQuickReplyMessage = this.sendQuickReplyMessage.bind(this)
  }

  setGalleryPermission (value) {
    this.setState({gelleryPermission: value})
  }

  setAttachmentsModal () {
    this.setState({showAttachmentsModal: !this.state.showAttachmentsModal})
  }

  componentDidMount () {
    this.fetchGifs()
  }

  UNSAFE_componentWillReceiveProps (nextProps) {
    if (nextProps.selectedCannedResponse) {
      if (!this.state.text.includes(nextProps.selectedCannedResponse.responseCode)) {
        this.setState({text: `/${nextProps.selectedCannedResponse.responseCode}`})
      }
    }
  }

  handleMessageResponse (res, data, payload) {
    if (res.status === 'success') {
      data.format = 'convos'
      this.setState({
        attachment: {},
        componentType: '',
        uploadingFile: false,
        uploaded: false,
        loading: false
      }, () => {
        // this.updateChatData(data, payload)
      })
    } else {
      this.setState({loading: false})
      Alert.alert('ERROR!', 'Failed to send message', [{ text: 'OK' }], { cancelable: true })
    }
  }

  async fetchGifs () {
    this.setState({loadingGif: true})
    try {
      const API_KEY = 'GG9olJLktt5SG2kJEdCj9YDuzgoWeYAr'
      const BASE_URL = 'http://api.giphy.com/v1/gifs/trending'
      const resJson = await fetch(`${BASE_URL}?api_key=${API_KEY}&q=hi`)
      const res = await resJson.json()
      this.setState({gifs: res.data, loadingGif: false})
    } catch (error) {
      console.warn(error)
    }
  }

  removeAttachment () {
    this.props.deletefile(this.state.attachment.id)
    this.setState({
      attachment: {},
      componentType: '',
      uploadingFile: false,
      uploaded: false
    })
  }

  getComponentType (type) {
    if (type.match('image.*')) {
      return 'image'
    } else if (type.match('audio.*')) {
      return 'audio'
    } else if (type.match('video.*')) {
      return 'video'
    } else if (type.match('application.*') || type.match('text.*')) {
      return 'file'
    }
  }

  uploadAttachment (file) {
    if (file.size && file.size > 25000000) {
      Alert.alert('ERROR!', 'Attachment exceeds the limit of 25MB', [{ text: 'OK' }], { cancelable: true })
    } else {
      let type = mime.lookup(file.uri)
      console.log('type', type)
      if ([
        'application/zip', 'text/javascript', 'text/exe', 'application/x-ms-dos-executable',
        'application/x-pem-file', 'application/x-x509-ca-cert'
      ].includes(type)) {
        Alert.alert('ERROR!', 'This file type is not supported', [{ text: 'OK' }], { cancelable: true })
      } else {
      const data = this.props.performAction('send attachments', this.props.activeSession)
      if (type) {
        if (data.isAllowed) {
          if (this.state.attachment && this.state.attachment.id) {
            this.props.deletefile(this.state.attachment.id)
          }
          const componentType = this.getComponentType(type)
          this.setState({
            uploadingFile: true,
            attachment: file,
            componentType
          })
          var fileData = new FormData()
          fileData.append('file', {uri: file.uri, type: type, name: file.name, size: file.size})
          fileData.append('filename', file.name)
          fileData.append('filetype', type)
          fileData.append('filesize', file.size)
          fileData.append('componentType', componentType)
          this.props.uploadAttachment(fileData, this.onAttachmentUpload)
        } else {
          Alert.alert('ERROR!', data.errorMsg, [{ text: 'OK' }], { cancelable: true })
        }
      } else {
        Alert.alert('ERROR!', 'This file type is not supported', [{ text: 'OK' }], { cancelable: true })
      }
     }
    }
  }

  selectAttachment () {
    this.setState({showPickers: false, selectedPicker: ''})
    DocumentPicker.getDocumentAsync()
      .then(result => {
        if (result && result.type === 'success') {
          this.setState({showAttachmentsModal: false})
          this.uploadAttachment(result)
        }
      })
      .catch((err) => {
        console.log('err in selecting file', err)
      })
  }

  onAttachmentUpload (res) {
    if (res.status === 'success') {
      let attachment = this.state.attachment
      attachment.id = res.payload.id
      attachment.url = res.payload.url
      this.setState({
        uploadingFile: false,
        attachment,
        uploaded: true
      })
    } else {
      this.setState({
        uploadingFile: false,
        attachment: {},
        componentType: ''
      })
      Alert.alert('ERROR!', 'Failed to upload attachment', [{ text: 'OK' }], { cancelable: true })
    }
  }

  showPickers () {
    // Keyboard.dismiss()
    this.setState({showPickers: true, selectedPicker: 'emoji'})
  }

  hidePickers () {
    this.setState({showPickers: false, selectedPicker: ''})
  }

  setEmoji (emoji) {
    this.setState({text: this.state.text + emoji})
  }

  updateChatData (data, payload) {
    let sessions = this.props.sessions
    let session = this.props.activeSession
    let index = sessions.findIndex((s) => s._id === session._id)
    sessions.splice(index, 1)
    session.lastPayload = payload
    session.lastRepliedBy = data.replied_by
    session.pendingResponse = false
    session.last_activity_time = new Date()
    this.props.updateNewMessage(true)
    this.props.updateState({
      reducer: true,
      userChat: [...this.props.userChat, data],
      sessions: [session, ...sessions]
    })
  }

  search (value) {
    if (this.props.cannedResponsesAll.length > 0) {
      let searchArray = []
      if (value[value.length - 1] === ' ') {
        let text = value.trim().slice(1)
        this.props.cannedResponsesAll.forEach(element => {
          if (element.responseCode.toLowerCase() === text.toLowerCase()) {
            if (!this.props.selectedCannedResponse || (this.props.selectedCannedResponse.responseCode !== element.responseCode)) {
              this.props.setCannedResponse(element)
            }
            searchArray.push(element)
          }
        })
        this.props.saveCannedResponses(searchArray)
      } else if (value !== '/') {
        let text = value.slice(1)
        this.props.cannedResponsesAll.forEach(element => {
          if (element.responseCode.toLowerCase().includes(text.toLowerCase())) searchArray.push(element)
        })
        this.props.saveCannedResponses(searchArray)
      } else {
        this.props.saveCannedResponses(this.props.cannedResponsesAll)
      }
    }
  }

  addNewLine (e) {
    if (e.nativeEvent.key === 'Enter') {
      let text = this.state.text
      text = text + '\n'
      this.setState({text: text})
    }
  }

  onInputChange (text) {
    if (text[0] === '/') {
      this.setState({text: text})
      this.props.showCannResponse(true)
      this.search(text)
    } else {
      const contactInfoTerms = ['email', 'phone', 'contact']
      const containsContactInfoTerms = contactInfoTerms.some(term => text.toLowerCase().includes(term))
      if (!this.state.suggestionShown && containsContactInfoTerms) {
        this.setState({showPopover: true, suggestionShown: true})
        setTimeout(() => {
          if (this.state.showPopover) {
            this.setState({showPopover: false})
          }
        }, 3000)
      }
      this.setState({text})
      this.props.showCannResponse(false)
      this.props.setCannedResponse(null)
    }
    if (this.props.selectedCannedResponse) {
      if (/\s/.test(text)) {
        var regex = new RegExp('^/' + this.props.selectedCannedResponse.responseCode, 'g')
        if (!text.match(regex)) {
          this.props.setCannedResponse(null)
          this.search(text)
        }
      } else {
        if (text !== `/${this.props.selectedCannedResponse.responseCode}`) {
          this.props.setCannedResponse(null)
          this.search(text)
        }
      }
    }
  }

  sendMessage (quickReplies) {
    const data = this.props.performAction('send messages', this.props.activeSession)
    if (data.isAllowed) {
      let payload = {}
      let data = {}
      if (this.props.selectedCannedResponse) {
        let selectedCannedResponse = this.props.selectedCannedResponse
        if (selectedCannedResponse.responseMessage === '') {
          Toast.default.show('Canned Message response cannot be empty')
        } else {
          let text = this.state.text
          if (text.includes(selectedCannedResponse.responseCode)) {
            text = text.replace(`/${selectedCannedResponse.responseCode}`, selectedCannedResponse.responseMessage)
            let payload = {
              componentType: 'text',
              text: text
            }
            data = this.props.setMessageData(this.props.activeSession, payload)
            this.props.sendChatMessage(data)
            data.format = 'convos'
            this.updateChatData(data, payload)
            this.setState({text: ''})
            this.props.setCannedResponse(null)
            this.props.showCannResponse(false)
          }
        }
      } else if (this.state.text !== '' && /\S/gm.test(this.state.text)) {
        payload = this.setDataPayload('text')
        if (quickReplies) {
          payload.quickReplies = quickReplies
        }
        data = this.props.setMessageData(this.props.activeSession, payload)
        this.props.sendChatMessage(data)
        this.setState({ text: '', urlmeta: {}, currentUrl: '', selectedPicker: '', showPickers: false })
        data.format = 'convos'
        this.updateChatData(data, payload)
        this.props.setCannedResponse(null)
        this.props.showCannResponse(false)
      } else if (this.state.attachment && this.state.attachment.name) {
        this.setState({loading: true})
        payload = this.setDataPayload('attachment')
        data = this.props.setMessageData(this.props.activeSession, payload)
        this.props.sendAttachment(data, (res) => this.handleMessageResponse(res, data, payload))
      }
    } else {
      Alert.alert(
        'ERROR!',
        data.errorMsg,
        [
          { text: 'OK' }
        ],
        { cancelable: true }
      )
    }
  }

  sendQuickReplyMessage (text, quickReplies) {
    this.setState({
      text
    }, () => {
      this.sendMessage(quickReplies)
    })
  }

  setDataPayload (component) {
    let payload = {}
    switch (component) {
      case 'text':
        payload = {
          componentType: 'text',
          text: this.state.text
        }
        break
      case 'attachment':
        payload = {
          componentType: this.state.componentType,
          fileName: this.state.attachment.name,
          size: this.state.attachment.size,
          type: this.state.attachment.type,
          fileurl: {
            id: this.state.attachment.id,
            name: this.state.attachment.name,
            url: this.state.attachment.url
          }
        }
        break
      case 'gif':
        payload = {
          componentType: this.state.componentType,
          fileurl: this.state.gif
        }
        break
      case 'sticker':
        payload = {
          componentType: this.state.componentType,
          fileurl: this.state.sticker
        }
        break
      case 'thumbsUp':
        payload = {
          componentType: 'thumbsUp',
          fileurl: 'https://cdn.cloudkibo.com/public/img/thumbsup.png'
        }
        break
      default:
    }
    return payload
  }

  changeTab (value) {
    this.setState({selectedPicker: value})
  }

  onRecordPress () {
    if (!this.state.recordingPermissionGranted) {
      Permissions.askAsync(Permissions.AUDIO_RECORDING)
        .then(response => {
          if (response.status === 'granted') {
            this.setState({recordingPermissionGranted: true})
          }
        })
    } else {
      if (this.state.isRecording) {
        this._stopRecording()
      } else {
        this._beginRecording()
      }
    }
  }

  async _beginRecording () {
    this.setState({
      isLoading: true
    })
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true
    })
      .then(result => {
        if (this.recording !== null) {
          this.recording.setOnRecordingStatusUpdate(null)
          this.recording = null
        }
        const recording = new Audio.Recording()
        recording.prepareToRecordAsync(this.recordingSettings)
          .then(result => {
            recording.setOnRecordingStatusUpdate(this._updateScreenForRecordingStatus)
            this.recording = recording
            this.recording.startAsync()
              .then(result => {
                this.setState({
                  isLoading: false
                })
              })
              .catch((err) => {
                console.log('error in startAsync', err)
              })
          })
          .catch((err) => {
            console.log('error in prepareToRecordAsync', err)
          })
      })
      .catch((err) => {
        console.log('error in setAudioModeAsync', err)
      })
  }

  _updateScreenForRecordingStatus (status) {
    if (status.canRecord) {
      this.setState({
        isRecording: status.isRecording,
        recordingDuration: status.durationMillis
      })
    } else if (status.isDoneRecording) {
      this.setState({
        isRecording: false,
        recordingDuration: status.durationMillis
      })
      if (!this.state.isLoading) {
        this._stopRecording()
      }
    }
  }

  async _stopRecording () {
    this.setState({
      isLoading: true
    })
    try {
      await this.recording.stopAndUnloadAsync()
    } catch (error) {
      // Do nothing -- we are already unloaded.
    }
    const info = await FileSystem.getInfoAsync(this.recording.getURI())
    this.setState({
      isLoading: false
    })
    const data = this.props.performAction('send attachments', this.props.activeSession)
    if (data.isAllowed) {
      let attachment = {uri: info.uri, type: 'audio/mp3', name: 'recorded-audio.mp3', size: info.size}
      this.setState({
        uploadingFile: true,
        attachment: attachment,
        componentType: 'audio'
      })
      var fileData = new FormData()
      fileData.append('file', attachment)
      fileData.append('filename', 'recorded-audio')
      fileData.append('filetype', 'audio/mp3')
      fileData.append('filesize', info.size)
      fileData.append('componentType', 'audio')
      this.props.uploadRecording(fileData, this.onAttachmentUpload)
    } else {
      Alert.alert('ERROR!', data.errorMsg, [{ text: 'OK' }], { cancelable: true })
    }
  }

  _getRecordingTimestamp () {
    if (this.state.recordingDuration != null) {
      return `${this._getMMSSFromMillis(this.state.recordingDuration)}`
    }
    return `${this._getMMSSFromMillis(0)}`
  }

  _getMMSSFromMillis (millis) {
    const totalSeconds = millis / 1000
    const seconds = Math.floor(totalSeconds % 60)
    const minutes = Math.floor(totalSeconds / 60)

    const padWithZero = number => {
      const string = number.toString()
      if (number < 10) {
        return '0' + string
      }
      return string
    }
    return padWithZero(minutes) + ':' + padWithZero(seconds)
  }

  sendSticker (sticker) {
    const data = this.props.performAction('send messages', this.props.activeSession)
    if (data.isAllowed) {
      const payload = {
        componentType: 'sticker',
        fileurl: sticker.image.hdpi
      }
      const data = this.props.setMessageData(this.props.activeSession, payload)
      this.props.sendChatMessage(data)
      data.format = 'convos'
      this.updateChatData(data, payload)
    } else {
      Alert.alert('ERROR!', data.errorMsg, [{ text: 'OK' }], { cancelable: true })
    }
  }

  sendGif (gif) {
    const data = this.props.performAction('send messages', this.props.activeSession)
    if (data.isAllowed) {
      const payload = {
        componentType: 'gif',
        fileurl: gif.images.original.url
      }
      const data = this.props.setMessageData(this.props.activeSession, payload)
      this.props.sendChatMessage(data)
      data.format = 'convos'
      this.updateChatData(data, payload)
    } else {
      Alert.alert('ERROR!', data.errorMsg, [{ text: 'OK' }], { cancelable: true })
    }
  }

  async changeGifSearchValue (text) {
    this.setState({gifSearchValue: text, loadingGif: true})
    if (text === '') {
      this.fetchGifs()
    } else {
      try {
        const API_KEY = 'GG9olJLktt5SG2kJEdCj9YDuzgoWeYAr'
        const BASE_URL = 'http://api.giphy.com/v1/gifs/search'
        const resJson = await fetch(`${BASE_URL}?api_key=${API_KEY}&q=${text}`)
        const res = await resJson.json()
        this.setState({gifs: res.data, loadingGif: false})
      } catch (error) {
        console.warn(error)
      }
    }
  }

  render () {
    return (
      <Block style={{paddingBottom: 10}}>
        <ATTACHMENTSMODAL
          showAttachmentsModal={this.state.showAttachmentsModal}
          setAttachmentsModal={this.setAttachmentsModal}
          updateAttachments={this.updateAttachments}
          selectAttachment={this.selectAttachment}
          gelleryPermission={this.state.galleryPermission}
          setGalleryPermission={this.setGalleryPermission}
          uploadAttachment={this.uploadAttachment}
        />
        <Block style={styles.messageFormContainer}>
          <Block flex row middle space='between'>
            { this.state.uploadingFile
              ? <Input
                borderless
                color='black'
                style={[styles.input, {width: width * 0.92}]}
                value='Uploading...'
                editable={false}
              />
              : this.state.uploaded && this.state.attachment.name
                ? <Input
                  borderless
                  color='black'
                  style={[styles.input, {width: width * 0.8}]}
                  value={`Attachment: ${this.state.attachment.name.length > 15 ? this.state.attachment.name.substring(0, 15) + '...' : this.state.attachment.name}`}
                  right
                  editable={false}
                  iconContent={
                    <Block row>
                      {!this.state.loading &&
                        <TouchableOpacity onPress={this.removeAttachment}>
                          <Icon size={20} color={theme.COLORS.MUTED} name='trash' family='entypo' />
                        </TouchableOpacity>
                      }
                    </Block>
                  }
                />
                : this.state.isRecording
                  ? <Input
                    borderless
                    color='black'
                    style={[styles.input, {width: width * 0.92}]}
                    value={`Recording... ${this._getRecordingTimestamp()}`}
                    editable={false}
                    right
                    iconContent={
                      <Block row>
                        <TouchableOpacity onPress={this.onRecordPress}>
                          <Icon size={20} style={{marginLeft: 5}} color={theme.COLORS.MUTED} name='stop-circle' family='feather' />
                        </TouchableOpacity>
                      </Block>
                    }
                  />
                  : <View>
                    {/* {this.state.showCannedMessages && <View style={{maxHeight:230}}>
                    <ScrollView>
                    {
                      this.state.cannedMessages.map((l, i) => (
                        <TouchableOpacity >
                        <ListItem
                          key={i}
                          title={l.responseCode}
                          subtitle={l.responseMessage}
                          containerStyle = {{height: 50}}
                          bottomDivider
                        />
                        </TouchableOpacity>
                      ))
                    }
                    </ScrollView>
                    </View>
                    } */}
                    <Input
                      multiline
                      numberOfLines={3}
                      onFocus={this.hidePickers}
                      borderless
                      color='black'
                      style={[styles.input, {width: this.state.text === '' ? width * 0.92 : width * 0.8}]}
                      placeholder='Type a message...'
                      returnKeyType='none'
                      placeholderTextColor='#9fa5aa'
                      value={this.state.text}
                      onKeyPress={(keyPress) => this.addNewLine(keyPress)}
                      onChangeText={text => this.onInputChange(text)}
                      right
                      iconContent={
                        <Block row>
                          <TouchableOpacity onPress={this.showPickers}>
                            <Icon size={20} color={theme.COLORS.MUTED} name='emoji-happy' family='entypo' />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => {
                            Platform.OS === 'android'
                              ? this.setAttachmentsModal()
                              : this.selectAttachment()
                          }}>
                            <Icon size={20} style={{marginLeft: 5}} color={theme.COLORS.MUTED} name='attachment' family='entypo' />
                          </TouchableOpacity>
                           {!this.props.isWhatsappModule &&
                          <TouchableOpacity onPress={this.onRecordPress}>
                            <Icon size={20} style={{marginLeft: 5}} color={theme.COLORS.MUTED} name='mic' family='feather' />
                          </TouchableOpacity>
                           }
                          {!this.props.isWhatsappModule &&
                          <Popover
                            onRequestClose={() => this.setState({showPopover: false})}
                            isVisible={this.state.showPopover}
                            from={<TouchableOpacity onPress={() => this.props.setGetContactInfoModal(this.sendQuickReplyMessage)}>
                              <Icon size={20} style={{marginLeft: 5}} color={theme.COLORS.MUTED} name='idcard' family='AntDesign' />
                            </TouchableOpacity>}>
                              <Text style={{margin: 10}}>Consider using this to get subscriber's email or phone number</Text>
                          </Popover>
                          }
                          {this.props.showZoom &&
                            <TouchableOpacity onPress={this.props.setZoomModal}>
                              <Image
                                source={{ uri: 'https://cdn.cloudkibo.com/public/img/zoom.png' }}
                                style={{height: 25, width: 25, marginLeft: 5}}
                                alt='Zoom'
                              />
                            </TouchableOpacity>
                          }
                        </Block>
                      }
                    />
                  </View>
            }
            {(this.state.text !== '' || this.state.uploaded) &&
            <Button
              disabled={this.state.loading}
              loading={this.state.loading}
              round
              shadowless
              radius={28}
              opacity={0.9}
              style={styles.iconButton}
              color={materialTheme.COLORS.BUTTON_COLOR}
              onPress={() => this.sendMessage()}
            >
              <Icon size={22} name='send' family='MaterialCommunityIcons' color='white' />
            </Button>
            }
          </Block>
        </Block>
        {this.state.showPickers && this.state.selectedPicker !== '' &&
          <Block>
            <Tabs
              data= { this.props.isWhatsappModule ? [{id: 'emoji', title: 'EMOJI', width: 70}] : [
                {id: 'emoji', title: 'EMOJI', width: 70},
                {id: 'stickers', title: 'STICKERS', width: 100},
                {id: 'gifs', title: 'GIFS', width: 55}
              ]}
              initialIndex={'emoji'}
              onChange={id => this.changeTab(id)}
            />
            {this.state.selectedPicker === 'emoji' &&
              <EmojiSelector
                category={Categories.emotion}
                onEmojiSelected={emoji => this.setEmoji(emoji)}
                showSearchBar={false}
                showSectionTitles={false}
                style={{height: 250, width: width}}
                columns={8}
                showHistory
              />
            }
            {this.state.selectedPicker === 'stickers' &&
              <Block style={{height: 250, width: width, marginVertical: 15}}>
                <StickerMenu
                  apiKey='80b32d82b0c7dc5c39d2aafaa00ba2bf'
                  userId='imran.shoukat@khi.iba.edu.pk'
                  sendSticker={(sticker) => this.sendSticker(sticker)}
                />
              </Block>
            }
            {this.state.selectedPicker === 'gifs' &&
              <Block style={styles.view}>
                <Input
                  placeholder='Search Gif...'
                  style={styles.textInput}
                  color='black'
                  onChangeText={(text) => this.changeGifSearchValue(text)}
                />
                {this.state.loadingGif
                  ? <ActivityIndicator size='large' />
                  : <FlatList
                    data={this.state.gifs}
                    numColumns={2}
                    renderItem={({item}) => (
                      <Block center style={{ flex: 1, flexDirection: 'column', marginBottom: 1 }}>
                        <TouchableOpacity onPress={() => this.sendGif(item)}>
                          <Image
                            resizeMode='stretch'
                            style={styles.image}
                            source={{uri: item.images.original.url}}
                          />
                        </TouchableOpacity>
                      </Block>
                    )}
                  />
                }
              </Block>
            }
          </Block>
        }
      </Block>
    )
  }
}

Footer.defaultProps = {
  'performAction': PropTypes.func.isRequired,
  'activeSession': PropTypes.object.isRequired,
  'user': PropTypes.object.isRequired,
  'sendChatMessage': PropTypes.func.isRequired,
  'updateState': PropTypes.func.isRequired,
  'userChat': PropTypes.array.isRequired,
  'sessions': PropTypes.array.isRequired,
  'uploadAttachment': PropTypes.func,
  'sendAttachment': PropTypes.func,
  'uploadRecording': PropTypes.func,
  'getPicker': PropTypes.func.isRequired,
  'togglePopover': PropTypes.func.isRequired,
  'updateNewMessage': PropTypes.func.isRequired,
  'deletefile': PropTypes.func,
  'updateChatAreaHeight': PropTypes.func.isRequired,
  'showUploadAttachment': PropTypes.bool.isRequired,
  'showRecordAudio': PropTypes.bool.isRequired,
  'showSticker': PropTypes.bool.isRequired,
  'showEmoji': PropTypes.bool.isRequired,
  'showGif': PropTypes.bool.isRequired,
  'showThumbsUp': PropTypes.bool.isRequired,
  'filesAccepted': PropTypes.string
}

export default Footer

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  messageFormContainer: {
    height: 70,
    marginHorizontal: 16
  },
  iconButton: {
    width: 43,
    height: 43,
    backgroundColor: '#716aca',
    marginLeft: 6
  },
  input: {
    height: 'auto',
    backgroundColor: theme.COLORS.WHITE,
    borderRadius: 30,
    paddingVertical: 5
  },
  view: {
    height: 250,
    width: width
  },
  textInput: {
    height: 40,
    borderWidth: 0,
    borderRadius: 0
  },
  image: {
    width: width / 2 - 2,
    height: 150
  }
})
