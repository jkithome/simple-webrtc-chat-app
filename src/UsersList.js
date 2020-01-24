import React from "react";
import {
  Grid,
  Segment,
  Card,
  List,
  Button,
  Image,
} from "semantic-ui-react";
import avatar from "./avatar.png";

const UsersList = ({ users, toggleConnection, connectedTo, connecting }) => {
  return (
    <Grid.Column width={5}>
      <Card fluid>
        <Card.Content header="Online Users" />
        <Card.Content textAlign="left">
          {(users.length && (
            <List divided verticalAlign="middle" size="large">
              {users.map(({ userName }) => (
                <List.Item key={userName}>
                  <List.Content floated="right">
                    <Button
                      onClick={() => {
                        toggleConnection(userName);
                      }}
                      disabled={!!connectedTo && connectedTo !== userName}
                      loading={connectedTo === userName && connecting}
                    >
                      {connectedTo === userName ? "Disconnect" : "Connect"}
                    </Button>
                  </List.Content>
                  <Image avatar src={avatar} />
                  <List.Content>
                    <List.Header>{userName}</List.Header>
                  </List.Content>
                </List.Item>
              ))}
            </List>
          )) || <Segment>There are no users Online</Segment>}
        </Card.Content>
      </Card>
    </Grid.Column>
  );
};

export default UsersList;
