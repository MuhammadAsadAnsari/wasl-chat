const client = require('../helpers/mongodb');
const { ObjectId } = require('mongodb');
var _ = require('lodash');


module.exports = {
    createChat,
    getChatDetailsById,
    getChatMessages,
    insertchat,
    getchatId,
    validateConversation,
    getAllChats,
};

async function createChat(user, createChatRequest) {
    try {

        if (user == createChatRequest.member.userid) {
            return {
                error: "Could not create a new chat with same person."
            }
        }

        if (user && createChatRequest.member.userid) {

            let chat = await client.db('wasl').collection('chats').findOne({
                members: {
                    $all: [
                        createChatRequest.member.userid,
                        user
                    ]
                }
            });

            if (chat) {
                //Chat already exists between the two users.
                return {
                    error: 'Cannot create a new chat. A chat already exists.',
                    chat_id: chat._id
                };
            }
            else {
                //Chat does not exist between the two users. Create a new chat.

                let newChat = await client.db('wasl').collection('chats').insertOne({
                    members: [
                        createChatRequest.member.userid,
                        user
                    ],
                    t: new Date(),
                });

                if (newChat.insertedCount > 0) {
                    return {
                        _id: newChat.insertedId
                    };
                }
                else {
                    return {
                        error: "Could not create a new chat."
                    }
                }
            }
        } else {
            return {
                error: "Could not create a new chat."
            }
        }

    }
    catch (err) {
        console.log(err);

        return {
            error: "Could not create chat. Something went wrong."
        };
    }
}


async function getChatDetailsById(profile_id, chat_id) {
    try {
        let chatDetail = await client.db('wasl').collection('chats').findOne({
            _id: ObjectId(chat_id)
        });

        if (chatDetail) {
            if (_.includes(chatDetail.members, profile_id)) {

                return chatDetail;
            }
            else {
                return {
                    error: "To access a chat you need to be one of the members."
                }
            }
        }
        else {
            return {
                error: "Requested chat does not exist."
            };
        }
    }
    catch (err) {
        console.log(err);
        return {
            error: "Could not fetch chat details for the given chat."
        };
    }
}

async function getChatMessages(profile_id, chat_id, offset, limit) {
    try {
        let chatDetail = await client.db('wasl').collection('chats').findOne({
            _id: ObjectId(chat_id)
        });

        if (chatDetail) {
            if (_.includes(chatDetail.members, profile_id)) {
                let messages = await client.db('wasl').collection('chat_messages').find({
                    chat_id: chat_id, 'deletedfor': { $ne: profile_id }
                })
                    .sort({ _id: -1 })
                    .skip(parseInt(offset))
                    .limit(parseInt(limit))
                    .toArray();

                if (messages.length > 0) {
                    messages.forEach(msg => {
                        delete msg["deletedfor"];
                    });

                    return messages;
                }
                else {
                    return [];
                }
            }
            else {
                return {
                    error: "To access a chat you need to be one of the members."
                }
            }
        }
        else {
            return {
                error: "Requested chat does not exist."
            };
        }
    }
    catch (err) {
        console.log(err);
        return {
            error: "Could not fetch chat messages for the given chat."
        };
    }
}

async function insertchat(chat) {
    console.log("🚀 ~ insertchat ~ chat:", chat)
    try {

        let newChat = await client.db('wasl').collection('chat_messages').insertOne(chat);

        if (newChat.insertedCount > 0) {

            updateConversation(chat.chat_id);

            return {
                _id: newChat.insertedId
            };
        }
        else {
            return {
                error: "Could not add new chat."
            }
        }
    }
    catch (err) {
        console.log(err);

        return {
            error: "Could not create chat. Something went wrong."
        };
    }
}

async function updateConversation(chatid) {

    let updated = await client.db('wasl').collection('chats').updateOne({
        _id: ObjectId(chatid)
    }, {
        $set: {
            t: new Date()
        },
    }, { upsert: false });

}

async function getchatId(member1, member2) {
    try {
        let chatDetail = await client.db('wasl').collection('chats').findOne({
            members: { $all: [member1, member2] }
        });

        if (chatDetail) {
            return {
                _id: chatDetail._id
            };
        }
        else {

            let newChat = await client.db('wasl').collection('chats').insertOne({
                members: [
                    member1,
                    member2
                ],
                t: new Date()
            });

            if (newChat.insertedCount > 0) {
                return {
                    _id: newChat.insertedId
                };
            }
            else {
                return {
                    error: "Could not create a new chat."
                }
            }
        }
    }
    catch (err) {
        console.log(err);
        return {
            error: "Could not fetch chat details for the given chat."
        };
    }
}

async function validateConversation(from, to, chatId) {
    try {
       
        let chatDetail = await client.db('wasl').collection('chats').findOne({
            members: { $all: [ObjectId(from), ObjectId(to)] }
        });
        console.log("🚀 ~ chatDetail ~ chatDetail:", chatDetail)

        if (chatDetail && chatDetail._id == chatId) {
            return {
                _id: chatDetail._id
            };
        }
        else {
            return {
                error: "Could not fetch chat details for the given chat."
            }
        }
    }
    catch (err) {
        console.log(err);
        return {
            error: "Could not fetch chat details for the given chat."
        };
    }
}

async function getAllChats(profile) {

    try {
        

        let docs = await client.db('wasl').collection('chats').aggregate([
            {
              '$match': {
                'members': profile
              }
            }, {
              '$project': {
                '_id': {
                  '$toString': '$_id'
                }, 
                'members': 1, 
                'created': '$t'
              }
            }, {
              '$lookup': {
                'from': 'chat_messages', 
                'localField': '_id', 
                'foreignField': 'chat_id', 
                'as': 'messages'
              }
            }, {
              '$unwind': {
                'path': '$messages'
              }
            }, {
              '$sort': {
                'messages.t': -1
              }
            }, {
              '$group': {
                '_id': '$_id', 
                'members': {
                  '$first': '$members'
                }, 
                'count': {
                  '$sum': 1
                }, 
                'latest_msg': {
                  '$first': '$messages.message'
                }, 
                't': {
                  '$first': '$messages.t'
                }
              }
            }, {
              '$unwind': {
                'path': '$members'
              }
            }, {
              '$project': {
                '_id': {
                  '$toObjectId': '$_id'
                }, 
                'members': {
                  '$toObjectId': '$members'
                }, 
                'count': 1, 
                'latest_msg': 1, 
                't': 1
              }
            }, {
              '$lookup': {
                'from': 'users', 
                'localField': 'members', 
                'foreignField': '_id', 
                'as': 'members'
              }
            }, {
              '$unwind': {
                'path': '$members'
              }
            }, {
              '$group': {
                '_id': '$_id', 
                'members': {
                  '$addToSet': '$members'
                }, 
                'count': {
                  '$first': '$count'
                }, 
                'latest_msg': {
                  '$first': '$latest_msg'
                }, 
                't': {
                  '$first': '$t'
                }
              }
            }, {
              '$sort': {
                't': -1
              }
            }
          ]).toArray();
        // let chat_id

        if (docs.length > 0) {

            return docs;
        } else {
            return [];
        }
    } catch (err) {
        console.log(err);
        return {
            error: "Could not fetch chats for the current user."
        };
    }

}
