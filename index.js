require('dotenv').config();
const { MongoClient, ObjectID } = require('mongodb');
const _ = require('lodash');
const url = process.env.NODE_ENV == 'production' ? process.env.PROD_DB_URI : process.env.DEV_DB_URI;
const db_name = process.env.DB_NAME;

const exec = async () => {
  let client, db, user_id;
  try {
    try {
      client = await MongoClient.connect(url);
      db = client.db(db_name);
    }
    catch(ex) {
      throw new Error(`Error connecting to db : ${ex}`);
    }

    if(!process.env.CONNECTION_TEST) {
      try {
        await new Promise((res, rej) => {
          const users = db.collection('users');
          const users_cursor = users.find().project({ company: 1 });
          users_cursor.on('end', res);
          users_cursor.on('data', user => {
            if(user.company && !(user.company instanceof ObjectID)) {
              user_id = user._id;
              const company_name = user.company;
              users_cursor.pause();
              users.findOneAndUpdate(
                { _id: user._id },
                {
                  $set: {
                    company_name,
                    company: null
                  }
                }
              )
              .then(() => {
                console.log(`Updated user ${user_id}`);
                users_cursor.resume()
              })
              .catch(e => { throw new Error(e) });
            }
          });
        });
      }
      catch(ex) {
        throw new Error(`Error updating user ${user_id} : ${ex}`);
      }
    }
    else {
      console.log(`>> Connection Test Successful. Remove 'CONNECTION_TEST' env variable to execute the script`);
    }
  }
  catch(ex) {
    console.log(ex);
  }
  finally {
    if(client) {
      client.close();
      console.log('>> Connection closed');
    }
  }
}

exec()
.then(() => process.exit())
.catch(console.log);
