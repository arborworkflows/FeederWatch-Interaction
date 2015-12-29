/*jslint browser: true */

/*globals d3, vg, $ */

/*
------------------------------------------------------------------------
  MongoDB Collection Browser app
  Tangelo web framework
  Developed by Kitware,Inc & KnowledgeVis, LLC

  Copyright [2013] [KnowledgeVis, LLC]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

--------------------------------------------------------------------------
 */

 // This application allows the user to instantiate a paginated, tabular view of a dataset
 // accessed through the Tangelo web framework.  The user can choose the name of the collection
 // to browse and the number of records to explore.

// this supports the species observation table 

var obs_querydata = [];
var obs_metadata = [];
var obs_rowdata= [];
var obs_editableGrid;
var currentProjectName = "";
var currentDatasetName = "";

// display for the species interaction table

var int_querydata = [];
var int_metadata = [];
var int_rowdata= [];
var int_editableGrid;

// global variables used to affect the editableGrid rendering
var pageSize = 50;
var currentFilter = '';

// We want to tell the difference between ints and floats when filling the table, so we need to define this test.
// it is supposed to become part of the standard eventually:

if (!Number.isInteger) {
  Number.isInteger = function isInteger (nVal) {
    return typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
  };
}



// helper function to get path of a demo image.  Used by the paginator
function image(relativePath) {
    return "images/" + relativePath;
}


// fill the control panels dialog box with the column values.  User can delete/add to show less of a wide table.
function  initializeColumnController(metadata) {
    var columnText = ''
    var nonameCount = 1

    // clear out any old data from a previous table
    // CRL - this doesn't work, the first table fills the controller and it never erases until a page refresh.
    //$('#columncontainer').html("");
    //d3.selectAll("selectize-input items not-full has-options has-items ui-sortable").html("")
    //$('#columncontainer').html('<input type="text" id="selectcolumn"  style="margin-right:20px; margin-top:10px;  width:400px; " />');

    for (i=0; i<metadata.length; i++) {
        dataobject = metadata[i]
        // create names for columns that have no header name. If there is a nonzero name, then use it
        // if name is missing, create "unnamed_1, unnamed_2, etc.
        if (dataobject.name.length<1) {
           var newName = 'unnamed_'+nonameCount.toString();
           columnText += newName +",";
           nonameCount = nonameCount+1;
           // since the column was unnamed,  we need to keep the name empty so it matches with
           // the empty label in the data array.  Assign the label to the label attribute only
           metadata[i].name = '';
           metadata[i].label = newName;
        } else {
         columnText += dataobject.name+",";
        }
    }
    // strip off last comma
    var resultList = columnText.substring(0,columnText.length-1)
    //console.log("column text:",resultList)

    // must set BOTH the value and the text. Without text, the values never show...  The
    // selectize plug-in is used to control the input and make it pretty to edit the values in
    $('#selectcolumn').attr('text',resultList)
    $('#selectcolumn').attr('value',resultList)
    $('#selectcolumn').selectize({
                        plugins: ['drag_drop','remove_button'],
			delimiter: ',',
		        persist: false,
			createOnBlur: true,
			create: function(input) {
				return {
				        value: input,
					text: input
					}
				}
			});

}


function update(tabledata) {
    "use strict";

    // learn how to browse javaScript objects introspectively


    console.log("query return is:  ",tabledata[0])
    //console.log("stringified: ",JSON.stringify(querydata[0]))
    //var attrib;
    //var thisObject = querydata[0]
    //for (attrib in querydata[0]) {
    //    console.log("found attrib: ",attrib)
    //    console.log("type of: ",typeof thisObject[attrib])
    //}

    // build the metadata dynamically from the objects returned from the query.  If we only checked the first one,
    // we would miss attributes contained only in later objects, but not in the first one.  Therefore, we
    // scan through results and adjust the metadata to include ALL attributes

    var AttributesToDisplay = ['count','reviewed','speciesCode','species','obsDate']
    var attrib;
    obs_metadata = [];
    var thisObject;
    var attriblist = [];
    var dataobject;
    var thisObject = tabledata[0];
    for (i=0; i<tabledata.length; i++) {
        dataobject = tabledata[i]
        for (attrib in dataobject) {
            // only display the attribute subset we are interested in
            if (AttributesToDisplay.indexOf(attrib)>-1) {
                // if this attribute is not already stored in our array, then add it
                if (attriblist.indexOf(attrib)<0) {
                    // don't display the "_id" attribute, since it is not interesting to non-technical users
                    if (attrib != '_id') {
                        //console.log("pushing: ",attrib)
                        // special purpose code here to further refine what javascript returns (which is 'string' or 'number').
                        // We further test for integer-ness in order to tell the editable grid the correct types to support sorting.
                        var thisType = typeof thisObject[attrib];
                        if (attrib == 'obsDate') {
                            obs_metadata.push({ name: attrib, label:attrib, datatype: 'string', editable: false});
                        }
                        else if (thisType != "number") {
                            obs_metadata.push({ name: attrib, label:attrib, datatype: (typeof thisObject[attrib]), editable: false});
                        }
                        else if (Number.isInteger(thisObject[attrib])) {
                            obs_metadata.push({ name: attrib, label:attrib, datatype: "integer", editable: false});
                        }
                        else {
                            obs_metadata.push({ name: attrib, label:attrib, datatype: "double", editable: false});
                        }
                        attriblist.push(attrib)
                    }
                }
          }
        }
    }

    // now that we know the column types, lets set up the control to render them and allow enable/disable per column
    //console.log(metadata)
    //initializeColumnController(obs_metadata)
    //initializeColumnControllerCallback(obs_metadata);

    // loop through the returned data and get it in the form the editableGrid is expecting.
    //  Study of the editableGrid code shows that the json is expected an array of the form:
    //      [ {id: 1, values: { "fieldname": value, "fieldname2": value2, ...},
    //        {id: 2, values: { "fieldname": value, "fieldname2": value2, ...},...]

    obs_rowdata = []
    for (var i = 0; i < tabledata.length; i++)
    {
        // simplify the species display to get rid of a JSON object
        tabledata[i]['species'] =  tabledata[i]['species']['commonName']
        // convert the date to readable form
        var thisdate = new Date(tabledata[i]['obsDate'])
        tabledata[i]['obsDate'] = thisdate.toUTCString()
        SpeciesInThisObservation.add(tabledata[i]['species'])
        obs_rowdata.push({id:i,values: tabledata[i]})
    }

    //console.log('update called');
    obs_editableGrid.load({"metadata": obs_metadata, "data": obs_rowdata});
    obs_editableGrid.renderGrid("tablecontent","testgrid");
    obs_editableGrid.refreshGrid();
    // update paginator whenever the table is rendered (after a sort, filter, page change, etc.)
    obs_editableGrid.updatePaginator();
}


function update_interaction(tabledata) {
    "use strict";

    // build the metadata dynamically from the objects returned from the query.  If we only checked the first one,
    // we would miss attributes contained only in later objects, but not in the first one.  Therefore, we
    // scan through results and adjust the metadata to include ALL attributes

    var AttributesToDisplay = ['delete','subject','interaction','target']
    var attrib;
    var attribindex;
    int_metadata = [];
    var thisObject;
    var attriblist = [];
    var dataobject;
    var thisObject = tabledata[0];
    for (i=0; i<tabledata.length; i++) {
        dataobject = tabledata[i]
//        for (attrib in dataobject) {
        for (attribindex in AttributesToDisplay) {
            attrib = AttributesToDisplay[attribindex]
            console.log(attrib)
            // only display the attribute subset we are interested in
            if (AttributesToDisplay.indexOf(attrib)>-1) {
                // if this attribute is not already stored in our array, then add it
                if (attriblist.indexOf(attrib)<0) {
                    // add a clickable delete button that deletes the row when it is selected
                    if (attrib == 'delete') {
                        int_metadata.push({ name: attrib, label:attrib, datatype: 'boolean', editable: true})
                        attriblist.push(attrib)
                    }
                    // don't display the "_id" attribute, since it is not interesting to non-technical users
                    else if (attrib != '_id') {
                        //console.log("pushing: ",attrib)
                        // special purpose code here to further refine what javascript returns (which is 'string' or 'number').
                        // We further test for integer-ness in order to tell the editable grid the correct types to support sorting.
                        var thisType = typeof thisObject[attrib];
                        if (thisType != "number") {
                            int_metadata.push({ name: attrib, label:attrib, datatype: (typeof thisObject[attrib]), editable: false});
                        }
                        else if (Number.isInteger(thisObject[attrib])) {
                            int_metadata.push({ name: attrib, label:attrib, datatype: "integer", editable: false});
                        }
                        else {
                            int_metadata.push({ name: attrib, label:attrib, datatype: "double", editable: false});
                        }
                        attriblist.push(attrib)
                    }
                }
          }
        }
    }
    // loop through the returned data and get it in the form the editableGrid is expecting.
    //  Study of the editableGrid code shows that the json is expected an array of the form:
    //      [ {id: 1, values: { "fieldname": value, "fieldname2": value2, ...},
    //        {id: 2, values: { "fieldname": value, "fieldname2": value2, ...},...]

    int_rowdata = []
    for (var i = 0; i < tabledata.length; i++)
    {
        // put in one dummy row because of the delete problem in editable grid. 
        //f (i == 0) {
           // int_rowdata.push({id:0,values: {'delete':false, 'subject':'(The subject species)','target':'(the interaction target)','interaction':'(the type of interaction)'}})
        //} 
        int_rowdata.push({id:i,values: tabledata[i]})
    }

    //console.log('update called');
    int_editableGrid.load({"metadata": int_metadata, "data": int_rowdata});
    int_editableGrid.renderGrid("interact_tablecontent","testgrid");
    int_editableGrid.refreshGrid();
    // update paginator whenever the table is rendered (after a sort, filter, page change, etc.)
    //int_editableGrid.updatePaginator();
}


// callback function invoked when the user changes the pageSize spinbox on the application webpage.  It forces
// the table to be re-rendered using the updated page size.  Then the paginator is updated to reflect the proper
// number of available pages.

function changePageSize(size) {
    //console.log("setting page size to: ",size);
    obs_editableGrid.setPageSize(size)
    obs_editableGrid.renderGrid("tablecontent","testgrid");
    obs_editableGrid.refreshGrid();
    obs_editableGrid.updatePaginator();
    // remember this and leave the value sticky until changed again
    pageSize = size;
};



function loadObservationTableDisplay(tablearray) {
    "use strict";

    var host,
        db,
        collection,
        query,
        limit;

    query = '{}'; limit = 50;

    // instantiate the grid with a fixed pageSize, so pagination is enabled.  Other advanced features, not yet supported,
    // by this demo, can be attached to the grid cells to enable updates.  the pageSize is updated by a spinbox on the
    // application webpage.

    obs_editableGrid = new EditableGrid("DemoGridSimple", {
    	enableSort: true, // true is the default, set it to false if you don't want sorting to be enabled
	editmode: "absolute", // change this to "fixed" to test out editorzone, and to "static" to get the old-school mode
	editorzoneid: "edition", // will be used only if editmode is set to "fixed"
	pageSize: pageSize
    });

    // bind page size selector, so user selection invokes a re-render of the table with new pageSize
    $("#pagesize").val(pageSize).change(function() { changePageSize($("#pagesize").val()); });

    // this has the desired effect of leaving the entry in the filter box and active until it is changed
    // or cleared by the user

    currentFilter = '';

    // filter when something is typed into filter
    _$('filter').onkeyup = function() { obs_editableGrid.filter(_$('filter').value); obs_editableGrid.updatePaginator(); };

    // render the table
    update(tablearray);
}


// top-level function for displaying content in the editable grid instance which displays the interaction table

function loadInteractionTableDisplay(tablearray) {
    "use strict";

    var query,
        limit;

    query = '{}'; limit = 50;

    // instantiate the grid with a fixed pageSize, so pagination is enabled.  Other advanced features, not yet supported,
    // by this demo, can be attached to the grid cells to enable updates.  the pageSize is updated by a spinbox on the
    // application webpage.

    int_editableGrid = new EditableGrid("DemoGridSimple", {
        enableSort: true, // true is the default, set it to false if you don't want sorting to be enabled
    editmode: "absolute", // change this to "fixed" to test out editorzone, and to "static" to get the old-school mode
    editorzoneid: "edition", // will be used only if editmode is set to "fixed"
    pageSize: pageSize
    });

    // bind page size selector, so user selection invokes a re-render of the table with new pageSize
    //$("#pagesize").val(pageSize).change(function() { changePageSize($("#pagesize").val()); });

    // this has the desired effect of leaving the entry in the filter box and active until it is changed
    // or cleared by the user

    //currentFilter = '';

    // filter when something is typed into filter
    //_$('filter').onkeyup = function() { int_editableGrid.filter(_$('filter').value); int_editableGrid.updatePaginator(); };

    // render the table
    update_interaction(tablearray);
}



// This function handles the behavior of moving through pages in a multipage table.  Depending on the pageSize
// variable (which indicates how many table lines to display at a time), the database query output is broken
// up into separate pages and the "paginator" section of the webpage allows the user to move through the pages.

// function to render the paginator control
EditableGrid.prototype.updatePaginator = function()
{
	var paginator = $("#paginator").empty();
	var nbPages = this.getPageCount();

	// get interval
	var interval = this.getSlidingPageInterval(20);
	if (interval == null) return;

	// get pages in interval (with links except for the current page)
	var pages = this.getPagesInInterval(interval, function(pageIndex, isCurrent) {
		if (isCurrent) return "" + (pageIndex + 1);
		return $("<a>").css("cursor", "pointer").html(pageIndex + 1).click(function(event) { obs_editableGrid.setPageIndex(parseInt($(this).html()) - 1); obs_editableGrid.updatePaginator();});
	});

	// "first" link
	var link = $("<a>").html("<img src='"+image("gofirst.png") + "'/>&nbsp;");
	if (!this.canGoBack()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { obs_editableGrid.firstPage(); obs_editableGrid.updatePaginator(); });
	paginator.append(link);

	// "prev" link
	link = $("<a>").html("<img src='" + image("prev.png") + "'/>&nbsp;");
	if (!this.canGoBack()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { obs_editableGrid.prevPage(); obs_editableGrid.updatePaginator(); });
	paginator.append(link);

	// pages
	for (p = 0; p < pages.length; p++) paginator.append(pages[p]).append(" | ");

	// "next" link
	link = $("<a>").html("<img src='" + image("next.png") + "'/>&nbsp;");
	if (!this.canGoForward()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { obs_editableGrid.nextPage(); obs_editableGrid.updatePaginator(); });
	paginator.append(link);

	// "last" link
	link = $("<a>").html("<img src='" + image("golast.png") + "'/>&nbsp;");
	if (!this.canGoForward()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { obs_editableGrid.lastPage(); obs_editableGrid.updatePaginator(); });
	paginator.append(link);
};





function  initializeColumnControllerCallback(metadata) {
        $('#selectcolumn').on("change", function() {
        // loop through the metadata and pass the elements that are enabled

        var newcolumnlist = $(this).val().split(",");
        //console.log(newcolumnlist)
        var filteredMetadata = [];
        var i,j;
        for (i=0; i<newcolumnlist.length; i++) {
           for (j=0; j<metadata.length; j++) {
              // if the attribute for this column is found in the string somewhere, then add the attribute
              //console.log(newcolumnlist[i],metadata[j])
             if (newcolumnlist[i] == obs_metadata[j].name) {
               filteredMetadata.push(obs_metadata[j])
               //console.log("found match")
              }
            }
        }
        // rerender the table with only the enabled attributes
        obs_editableGrid.load({"metadata": filteredMetadata, "data": obs_rowdata});
        obs_editableGrid.renderGrid("tablecontent","testgrid");
        obs_editableGrid.refreshGrid();
        // update paginator whenever the table is rendered (after a sort, filter, page change, etc.)
        obs_editableGrid.updatePaginator();
        });
}


// adding routines to support deleting records and reacting to changes
