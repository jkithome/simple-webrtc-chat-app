// This is the message area
import React from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Card,
  Sticky,
  Button,
  Comment,
  Form,
  Label,
  Message
} from "semantic-ui-react";
import { formatRelative } from "date-fns";
import avatar from "./avatar.png";

const MessageBox = ({ messages, connectedTo, message, setMessage, sendMsg, me }) => {
  return (
    <Grid.Column width={11}>
      <Sticky>
        <Message warning>
          <Message.Header>Nothing here is private! All messages are sent to everyone on this site.</Message.Header>
        </Message>
        <Card fluid>
          <Card.Content
            header={
              !!connectedTo ? connectedTo : "Not chatting with anyone currently"
            }
          />
          <Card.Content>
            {!!connectedTo && messages[connectedTo] ? (
              <Comment.Group>
                {messages[connectedTo].map(({ sender, message: text, time }) => (
                  <Comment key={`msg-${sender}-${time}`}>
                    <Comment.Avatar src={avatar} />
                    <Comment.Content>
                      <Comment.Author><Label pointing={sender === me ? 'right' : 'left'}>{sender === me ? 'Me' : sender}</Label></Comment.Author>
                      <Comment.Metadata>
                        <span>
                          {formatRelative(new Date(time), new Date())}
                        </span>
                      </Comment.Metadata>
                <Comment.Text>{text}</Comment.Text>
                    </Comment.Content>
                  </Comment>
                ))}
              </Comment.Group>
            ) : (
              <Segment placeholder>
                <Header icon>
                  <Icon name="discussions" />
                  No messages available yet
                </Header>
              </Segment>
            )}
            <Form>
            <Input
              fluid
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type message"
              action
            >
              <input />
              <Button color="teal" disabled={!message} onClick={sendMsg}>
                <Icon name="send" />
                Send Message
              </Button>
            </Input>
            </Form>
          </Card.Content>
        </Card>
      </Sticky>
    </Grid.Column>
  );
};

export default MessageBox;
