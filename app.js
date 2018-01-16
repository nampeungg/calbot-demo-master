var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

//Set Up Database.

var Connection = require('tedious').Connection;  
var config = {  
    userName: 'nampeungg',  
    password: 'Peung239.',  
    server: 'np-server.database.windows.net',  
    options: {encrypt: true, database: 'NP-DB'}  
};  

var connection = new Connection(config);  
connection.on('connect', function(err) {  
});
var Request = require('tedious').Request;  
var TYPES = require('tedious').TYPES;  

// Bot Storage: Here we register the state storage for your bot. 
// Default store: volatile in-memory store - Only for prototyping!
// We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
// For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
var inMemoryStorage = new builder.MemoryBotStorage();

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage); // Register in memory storage;
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.set(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

bot.dialog('/', [
    function (session) {
        // Send a greeting and show help.
        var card = new builder.HeroCard(session)
            .title("NP Shop")
            .text("All the clothes you need")
            .images([
                 builder.CardImage.create(session, "https://image.ibb.co/kL4Ce6/online_store.png")
            ]);
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.send("Hi... Welcome to NP Shop.");

        session.beginDialog('/help');
    },
    function (session, results) {
        // Display menu
        session.beginDialog('/menu');
    },
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/menu', [
    function (session) {
        builder.Prompts.choice(session, "What do you want to ask?", "Detail of Products|Recommendation|FAQ|(quit)");
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });

bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* menu - Exits a demo and returns to the menu.\n* goodbye - End this conversation.\n* help - Displays these commands.");
    }
]);

bot.dialog('/Detail of Products', [
    function (session) {
        session.send("What do you want to know about our products? Please tell me.")
        builder.Prompts.choice(session, "Please Choose : ", "Price|Stock|Size|Color|none");
    },
    function (session, results) {
        session.send("You want to know about the "+results.response.entity+"...")
        if (results.response.entity == "Price") {
            session.beginDialog('askPrice');
        }
    }
]);

bot.dialog('askPrice', [
    function (session) {
        builder.Prompts.text(session,"Enter Product Name: ");
    },
    function (session,results){
        session.send(results.response);
        executeStatement(session,"SELECT * FROM Products WHERE Name = 'Oxford Shirt'");
    }
]);


function executeStatement(session,sql_query) {  
    request = new Request(sql_query, function(err) {  
    if (err) {  
        session.send(err);}  
    });  
    var result = "";  
    request.on('row', function(columns) {  
        columns.forEach(function(column) {  
          if (column.value === null) {  
            session.send('NULL');  
          } else {  
            result+= column.value + " ";  
          }  
        });  
        session.send(result);  
        result ="";  
    });  

    request.on('doneInProc', function(rowCount, more) {  
    session.send(rowCount + ' rows returned');  
    });  
    connection.execSql(request);  
}  