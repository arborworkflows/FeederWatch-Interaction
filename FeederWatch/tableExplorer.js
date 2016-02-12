
// make these global variables so the tables can be displayed

var observationTable = []
var interactionTable = []
var SpeciesInThisObservation = new Set()
var obs_interactions = ['Displaced','Predated','Mobbed']
var CurrrentObservationMetadata = {}

function load(file) {
var xmlfilecontent = []
if (file==null)
  xmlfilecontent = "<header> <a>sometext</a> </header>"
  else {
  var reader = new FileReader();

  reader.onload = function(e) {

        // show the contents of the dropped file in the console
        //console.log("got file: ",e.target.result)

        // Fire an ajax call to parse the file into JSON using python.  Pass the XML text and the name
        // of the dropped filename to the processing service
        serviceUrl = "service/converttabletojson"
        $.ajax({
        type: 'PUT',
        url: serviceUrl,
        data: {
           data: e.target.result,
           fileName: file.name
           },
        dataType: "json",
        success: function (response) {
            // If the value could not be retrieved, set it to null and print
            // an error message on the console.
            if (response.error || response.result.length === 0) {
                max = null;

                if (response.error) {
                    tangelo.fatalError("something bad happened");
                }
            } else {
                console.log("received json response:",response)
                // we know the operation is complete now, so query the database and update the UI
                initializeDatasetSelector();
            }
        }
        });
  }
  reader.readAsText(file);
  //console.log(reader);
}
}

function updateTextDescription(metadata) {
    var Comments = "You are adding interaction data from "+metadata['location_name'] + " on "+ metadata['date']+ "."
    Comments = Comments + "  Below is the list of species seen on this FeederWatch count:"
    $('p#description').text(Comments);
}


// call a python service to examine the database and return a list of names for the tables currently stored.  Fill the selector
// element on the webpage with the list

function retrieveObservation() {
        var observCode =  d3.select("#observationNumber").node().value;
        var serviceCall = "service/retrieve_observation/"+observCode
        d3.json(serviceCall, function (error, table) {
            console.log('query:',serviceCall)
            console.log('retrieved:',table,"\n");
            updateTextDescription(table['metadata'])
            loadObservationTableDisplay(table['observations']);
            initializeBehaviorSource();
            initializeBehaviorTarget();
            initializeInteractionBehaviors();
            // save current obs data globally for use when writing interactions
            CurrrentObservationMetadata = table['metadata']
            // put in the date from the API instead of the text date from the webpage
            CurrrentObservationMetadata['date'] = table['observations'][0]['obsDate']

        });
        // there may be some interactions already loaded for this observation number
        retrieveInteractions();
}

// retrieve the interaction records for this particular observation from the database and fill the table on the web page


function retrieveInteractions() {
         var observCode =  d3.select("#observationNumber").node().value;
         var serviceCall = "service/retrieve_interactions/"+observCode
        d3.json(serviceCall, function (error, table) {
            console.log('interact query:',serviceCall)
            console.log('interact retrieved:',table,"\n");
            loadInteractionTableDisplay(table.data);
        });

}

// call a python service to examine the database and return a list of names for the tables currently stored.  Fill the selector
// element on the webpage with the list

function initializeDatasetSelector() {
        d3.select("#datasets").selectAll("option").remove();
        d3.json("service/listtables", function (error, tables) {
            console.log(tables,"\n");
            d3.select("#datasets").selectAll("option")
                .data(tables.result)
                .enter().append("option")
                .text(function (d) { return d; });
            // now that the data is back and loaded, setup the query UI elements. This has to be done inside this
            // call so the data is ready when it fires off.  Without this call below, the query selector is initialized
            // to early (before the dataselector is loaded).
            initializeQueryControls();
        });
}


// this is a kludge needed to clear the input filter on the webpage when the table is changed.  But the input field is not
// erasable, so we can force the display to ignore it until it is changed.  But this isn't too good either.
function clearInputField() {
   editableGrid.filter('');

}


// These routines initialize the values in HTML selectors so the user can pick a source species, a behavior, and a target species

function initializeBehaviorSource() {
        d3.select("#sourcebird").selectAll("option").remove();
            d3.select("#sourcebird").selectAll("option")
                .data(obs_rowdata)
                .enter().append("option")
                .text(function (d) { return d.values.species; });
}

function initializeBehaviorTarget() {
        d3.select("#targetbird").selectAll("option").remove();
            d3.select("#targetbird").selectAll("option")
                .data(obs_rowdata)
                .enter().append("option")
                .text(function (d) { return d.values.species; });
}

function initializeInteractionBehaviors() {
        d3.select("#interactions").selectAll("option").remove();
            d3.select("#interactions").selectAll("option")
                .data(obs_interactions)
                .enter().append("option")
                .text(function (d) { return d; });
}


// this routine writes one new record to the database of interspecies interactions. A mongoDB database is kept for all
// interaction records.  Records are indexed by the observation number, and include the source species, target species, and behavior

function addInteractionRecord() {

    var sourceselector = d3.select("#sourcebird").node();
    var sourcebird = sourceselector.options[sourceselector.selectedIndex].text;
    var targetselector = d3.select("#targetbird").node();
    var targetbird = targetselector.options[targetselector.selectedIndex].text;
    var interactselector = d3.select("#interactions").node();
    var interaction = interactselector.options[interactselector.selectedIndex].text;
    var observCode =  d3.select("#observationNumber").node().value;
    console.log('source,target,action,observe:',sourcebird,targetbird,interaction,observCode) 

    // now do an AJAX call to write out the record to the database and then
    //  refresh the display on the screen. 
    var record = observCode + '/'+ sourcebird.replace('/',':') + 
                        '/' + targetbird.replace('/',':') + '/' + interaction.replace('/',':') + 
                        '/'+ CurrrentObservationMetadata['location_name'] + 
                        '/' + CurrrentObservationMetadata['location_lat'] + '/' + CurrrentObservationMetadata['location_lng'] +
                        '/' + CurrrentObservationMetadata['date']
    console.log(record)
    d3.json("service/writerecord/"+record, function (error, interactiontable) {
        console.log('wrote new interaction:',record)
        retrieveInteractions()      
    });
   
}

function showThanksAndResetForm() {
    $('#thanks-panel').modal("show")
    window.setTimeout(function() {
        $('#thanks-panel').modal("hide")
        location.reload()
        window.scrollTo(500, 0);
    },3000)
}

function allFinished() {
    $('#return-panel').modal("show")
    window.setTimeout(function() {
        $('#thanks-panel').modal("hide")
        window.location.href = "http://www.feederwatch.org"
    },3000)
}



function returnCurrentObservation() {
    return d3.select("#observationNumber").node().value;
}

function deleteInteractionTable() {
    d3.select("#interact_tablecontent").empty();
}

// this function is called as soon as the page is finished loading
window.onload = function () {

        //initializeDatasetSelector()

        d3.select("#retriveObservation")
            .on("click", retrieveObservation);

        d3.select("#addInteraction")
            .on("click", addInteractionRecord);

        d3.select("#thanksAndResetButton")
            .on("click", showThanksAndResetForm);

        d3.select("#finishedButton")
            .on("click", allFinished);


        $("#observationNumber").keyup(function(event){
            if(event.keyCode == 13){
                retrieveObservation();
            }
        });

};
