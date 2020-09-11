import { RequestHandler, getRequestType, getUserId } from "ask-sdk-core";
import { dialog } from "ask-sdk-model";

import * as firebaseAdmin from 'firebase-admin';
import { Feed } from "../logic/Feed";

const DB = firebaseAdmin.firestore();

export const LaunchRequestHandler : RequestHandler = {
    canHandle(handlerInput) {
        return getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const {attributesManager, responseBuilder} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const {t} = requestAttributes;

        const speakOutput: string = t('WELCOME_MSG');

        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        console.log('(LaunchRequest) Session Attributes: ' + JSON.stringify(sessionAttributes));

        let feeds: { [x: string]: Feed; }, feedNames: string[];
        if (!(sessionAttributes.feeds && sessionAttributes.feedNames)) {
            console.log('(LaunchRequest) Retrieving feeds data from database');

            const userId = getUserId(handlerInput.requestEnvelope);

            const userDataQuery = await DB.collection('users').where('userId', '==', userId).limit(1).get();

            let userData: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
            if (userDataQuery.empty) {
                console.log('(LaunchRequest) No user data. Creating new user');
                // No user data. Create user data in database
                userData = await DB.collection('users').add({userId: userId});
            } else {
                console.log('(LaunchRequest) Existing user. Retrieving user data');
                // Get user data from query
                userData = userDataQuery.docs[0];
            }
            // Get ID from database and store it in session attributes
            const userIdDB = userData.id;
            sessionAttributes.userIdDB = userIdDB;

            console.log('(LaunchRequest) User ID: ' + userIdDB);

            const nameField: string = t('FEED_NAME_FIELD');
            const feedNameSnapshots =
                await DB.collection('feeds')
                    .where('userId', '==', userIdDB) // Filter documents from the current user
                    .orderBy(nameField) // This filters out documents without the field
                    .get();

            feeds = {};
            feedNames = [];

            feedNameSnapshots.forEach((snapshot) => {
                const data = snapshot.data();
                
                const name: string = data[nameField];
                
                const feed : Feed = new Feed(name, data.url, data.language);

                feedNames.push(name);
                feeds[name] = feed;
            });

            sessionAttributes.feeds = feeds;
            sessionAttributes.feedNames = feedNames;

            attributesManager.setSessionAttributes(sessionAttributes);
        } else {
            console.log('(LaunchRequest) Feeds data was already in session attributes');
            feeds = sessionAttributes.feeds;
            feedNames = sessionAttributes.feedNames;
        }

        console.log('(LaunchRequest) Feed names: ' + JSON.stringify(feedNames));
        console.log('(LaunchRequest) Feeds (data): ' + JSON.stringify(feeds));

        // Use the map function to have the names in the correct format (as slot values)
        const feedNamesAsSlotValues = feedNames.map((value) => {
            return {
                name: {
                    value: value
                }
            }
        });

        console.log('(LaunchRequest) Feed names (as slot values): ' + JSON.stringify(feedNamesAsSlotValues));

        // Add the user's feed names
        const replaceEntityDirective : dialog.DynamicEntitiesDirective = {
            type: 'Dialog.UpdateDynamicEntities',
            updateBehavior: 'REPLACE',
            types: [
                {
                    name: 'FeedName',
                    values: feedNamesAsSlotValues
                }
            ]
        }

        return responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .addDirective(replaceEntityDirective)
            .getResponse();
    }
};