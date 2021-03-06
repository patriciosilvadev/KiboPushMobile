import React from 'react'
import { StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native'
import { Block, Text, Button } from 'galio-framework'
import Icon from '../../components/Icon'
import { materialTheme } from '../../constants/'
import moment from 'moment'
import { withNavigation } from '@react-navigation/compat'
const { width } = Dimensions.get('screen')

class SessionsListItem extends React.Component {
  constructor (props, context) {
    super(props, context)
    this.state = {
    }
    this.getChatPreview = this.getChatPreview.bind(this)
  }

  getChatPreview () {
    const chatPreview = this.props.getChatPreview(this.props.session.lastPayload, this.props.session.lastRepliedBy, this.props.session.firstName)
    if (chatPreview.length > 25) {
      return `${chatPreview.substring(0, 25)}...`
    } else {
      return chatPreview
    }
  }

  render () {
    const {session} = this.props
    return (
      <TouchableOpacity style={styles.touchableOpacity} onPress={() => this.props.changeActiveSession(session)}>
        <Block flex row style={{paddingVertical: 20}}>
          <Block center flex={0.3}>
            <Image
              onError={(e) => this.props.profilePicError(session, e)}
              source={{uri: session.profilePic ? session.profilePic : 'https://cdn.cloudkibo.com/public/icons/users.jpg'}}
              style={styles.avatar} />
          </Block>
          <Block flex={0.7}>
            <Text size={16} style={{marginBottom: 3}}>
              {session.name ? session.name : `${session.firstName} ${session.lastName}`}
            </Text>
            <Text h7 muted style={{marginBottom: 5}} numberOfLines={1}>
              {session.lastPayload
                ? this.getChatPreview()
                : 'No chat preview is available'
              }
            </Text>
            <Block flex row>
            { session.pageId &&
              <Icon
                size={16}
                name='facebook'
                family='entypo'
                color={materialTheme.COLORS.MUTED}
                style={{marginRight: 5}}
              />
            } 
              { session.pageId &&
              <Text h7 muted style={{marginRight: 10, width: width / 4}} numberOfLines={1}>
                {session.pageId.pageName}
              </Text>
              }
              <Icon
                size={16}
                name='calendar'
                family='entypo'
                color={materialTheme.COLORS.MUTED}
                style={{marginRight: 5}}
              />
              <Text h7 muted style={{width: width / 3}} numberOfLines={2}>
                {moment(this.props.session.last_activity_time).fromNow()}
              </Text>
            </Block>
          </Block>
          <Block flex={0.2} middle>
            {session.unreadCount && session.unreadCount > 0
              ? <Button round style={{ width: 30, height: 30 }} color='error'>
                <Text style={{color: 'white'}}>{session.unreadCount}</Text>
              </Button>
              : null
            }
          </Block>
        </Block>
      </TouchableOpacity>
    )
  }
}

export default withNavigation(SessionsListItem)
const styles = StyleSheet.create({
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 50,
    marginHorizontal: 16
  },
  touchableOpacity: {
    borderBottomWidth: 1,
    borderBottomColor: '#f4f5f8'
  }
})
