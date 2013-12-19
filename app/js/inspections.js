/**********************************************************
OBJECT: INSPECTIONS
***********************************************************/

/***
* @project: Planet Earth Cleaning Company iPad App
* @author: Andrew Chapman
*/

var Inspections = function()
{
	// Inspection level pop selectors
	this.objPopBuilders = null;
	this.objPopState = null;
	
	// Defect level pop selectors.
	this.objPopLocation = null;
	this.objPopAction = null;
    this.observation = '';
	this.sortBy = "i.inspection_start";
	this.sortDir = "DESC";
	this.initials = "";
	this.restricted = false;
	this.finalised = 0;
	this.objToggleFailed = null;
	this.lastKeyPress = null;
	this.doingSave = false; 
    this.scroller = null;
    
    this.currentStep = 0;
    this.isEditing = 0;
    this.itemSortBy = 'seq_no';
    this.itemSortDir = 'DESC';
    this.numberOfIssues = 0;
    this.numberOfAcknowledgements = 0;
    this.historyPhotosHtml = '';
    this.glDatePicker = null;
    this.is_change_order = false;
	this.builder_id = "";
	this.inAudit = false;
    this.cur_sel_ins_item;
	this.numImgCurr = 0;
    this.reinspectionKey = null;
	var self = this;
	$(".inspectionDetails #btnCapturePhoto").append('<div class="numImgCurr">' + self.numImgCurr + '</div>');
	this.setupInspections = function()
	{
		// Clear the main screen area
		objApp.clearMain();
        self.unbindEvents();
        objDBUtils.orderBy = "";
        $("#inspectionList .bottomBtns").find("a").removeClass("active");
        $("#inspectionList #builder_id").empty();
        $("#inspectionList #builder_id").append('<option value="">Choose</option>');
        if(!self.doingSave)
        {
            objDBUtils.loadSelect("builders", ["id","name"], "#inspectionList #builder_id", function(){
                console.log('load builders suggession finish');
                self.doingSave = false;
            }, "option"); 
        }
        self.doingSave = true;
		objDBUtils.orderBy = "ABS(name) ASC";
		objApp.callbackMethod = null;	// Reset app callback.
		
		// Set the main heading
        objApp.setHeading("Blueprint Inspections");
		objApp.setSubHeading("Inspection Listing");
		objApp.setNavActive("#navInspections");
		
		// Show the inspectionListing screen
		$("#inspectionList").removeClass("hidden");  
        
        $("form.search input").val("");
        $("form.search").show();      
        
        $("#inspectionList #btnAddInspection").unbind();
        
        $("#inspectionList #btnAddInspection").bind(objApp.touchEvent, function()
        {
             objApp.cleanup();
             self.setReturnInspectionID("");
             self.addNewInspection(); 
             objApp.context = "inspection";
             
             return false;
        });          
	    

	    // Initialise filters
		objFilters.filterScreen = "inspections";
		
		// Setup the status filter to show the correct options for the client screen
		//removePopOptions("#frmFilters #filterStatus", 1, "", "View All");
		//objFilters.objPopStatus.addOption("0", "Active Clients");
		//objFilters.objPopStatus.addOption("1", "Not Active Clients");
		
		objFilters.clearFilters();  
		objFilters.restoreDefaults();
		
		// Show only the filters we want
	    objFilters.hideAllFilters();
	    objFilters.showHideFilter("#filterName", true);
	    objFilters.showHideFilter("#filterClient", true);
	    objFilters.showHideFilter("#filterSite", true);
        objFilters.showHideFilter("#filterUser", true);
	    objFilters.showHideFilter("#filterFinalised", true);
	    objFilters.showHideFilter("#filterRecordLimit", true);

		
		// Set the filters search method
		objFilters.searchMethod = objApp.objInspection.doInspectionSearch;
		
	    //objFilters.show();

		// Do the client search
		self.doInspectionSearch();
        
        $("form.search").unbind();
        $('#inspectionList .btnContainer a#passed').click(function() {
            if (!$(this).hasClass("active"))
            {
                $(this).parent().parent().find("a#failed.active").removeClass("active");
                $(this).addClass("active");
                self.doInspectionSearch();
            }
        });
        $('#inspectionList .btnContainer a#failed').click(function() {
            if (!$(this).hasClass("active"))
            {
                $(this).parent().parent().find("a#passed.active").removeClass("active");
                $(this).addClass("active");
                self.doInspectionSearch();
            } 
        });
        $("form.search input").keyup(function() {
            self.doInspectionSearch();    
        });
        $("#inspectionList #builder_id").change(function(){
            self.doInspectionSearch();
        });
        
        
        self.bindEvents();
        
	}
    
	/***
	* doInspectionSearch searches the inspections database
	* taking into consideration any user entered search terms.  
	*/
	this.doInspectionSearch = function()
	{   
        self.unbindEvents();
        objApp.showHideSpinner(true, "#inspectionList");
            
		// Remove the triangle from the table header cells
		$("#tblInspectionListingHeader th .triangle").remove();
		
		$("#tblInspectionListingHeader th").unbind();
		// $("#tblInspectionListing tr").unbind();
		
		// Inject the triangle
		$("#tblInspectionListingHeader th[class='" + self.sortBy + "']").append('<span class="triangle ' + self.sortDir + '"></span>');	
        
        // Remove previously bound events
        $("#inspectionScrollWrapper").unbind();
        
        // Remove any existing items in the list.
        $("#inspectionScrollWrapper").html("");            	
		
		
		var sql = "SELECT i.*" +
			"FROM inspections i " +
            
			"WHERE i.deleted = 0 ";
			
		var values = new Array();
        
        var searchText = $("form.search input").val();
        objFilters.builder_id = $("#inspectionList #builder_id").val();   
        if(searchText != "")
        {
            sql += "AND (" +
                            "(i.report_type LIKE '%" + searchText + "%') " +
                            "OR (i.address LIKE '%" + searchText + "%') " +
                            "OR (i.suburb LIKE '%" + searchText + "%') " +
                            "OR (i.lot_no LIKE '%" + searchText + "%') " +
                            "OR (i.postcode LIKE '%" + searchText + "%') " +
                            "OR (i.inspection_date LIKE '%" + searchText + "%') " +
                            ") ";                
        }        
		
	    // Apply advanced search filters  
	    if(objFilters.builder_id != "")
	    {
	    	sql += "AND i.builder_id = ? ";
            values.push(objFilters.builder_id);
	    }
	    if($('#inspectionList .btnContainer a').hasClass('active'))
        {
            if ($('.btnContainer a').hasClass('status-failed active'))
                sql += "AND i.failed = 1 ";   
            else if($('.btnContainer a').hasClass('status-passed active'))
                sql += "AND i.failed = 0 ";
        }
	    if(objFilters.finalised != "")
	    {
	    	sql += "AND i.finalised = ? ";
	    	values.push(objFilters.finalised);
	    }  
	    
	    if(objFilters.name != "")
	    {
	    	sql += "AND i.initials LIKE '%" + objFilters.name + "%' "; 
	    }
        
        if((objFilters.user != "") && (objFilters.user != "all"))
        {
            sql += "AND i.created_by = ? ";
            values.push(objFilters.user);
        }        	    	    	     	    	                      
	    
	    sql += "ORDER BY " + self.sortBy + " " + self.sortDir + " ";	// Show the most recent inspections first.
	    
	    if((objFilters.recordLimit != "") && (objFilters.recordLimit != "all"))
	    {            
	    	sql += "LIMIT ?";
	    	values.push(objFilters.recordLimit);
	    }		    
	    
	    blockElement("#frmFilters");
        // load select builder
        objDBUtils.primaryKey = "id";
		objDBUtils.showColumn = "name";        
	    
	    objDBUtils.loadRecordsSQL(sql, values, function(param, items)
	    {
		    // Remove any element block
		    unblockElement("#frmFilters");
			
			if(!items)
            {
                objApp.showHideSpinner(false, "#inspectionList");
				return;	 
            }
		    
			var html = '<table id="tblInspectionListing" class="listing">';
			
			var maxLoop = items.rows.length;
			var r = 0;
			
			for(r = 0; r < maxLoop; r++)
			{
				var num_defects = 0;
			    var row = items.rows.item(r);
			    var inspDate = objApp.isoDateStrToDate(row.inspection_date);
			    
			    html += '<tr rel="' + row.id + '">';	
                html += '<td class="delete"></td>';
			    html += '<td>'
                
                html += '<span class="icon';
			    
			    if(row.finalised)
			    {
					html += ' finalised';
			    }
			    
			    html += '"></span>';
			
			    html += objApp.formatUserDate(inspDate) + '</td>';  
			    html += '<td>' + row.lot_no + ' ' + row.address + ' ' + row.suburb + '</td>';
			    html += '<td><div class="i-passed">';
                if (row.failed == 1)
                    html += 'Failed<a href="#" class="status-failed"></a></div>';
                else
                    html += 'Passed<a href="#" class="status-passed"></a></div>';
                html += '</div></td>';
                html += '<td><div class="action">';
                if(row.finalised == 0)
                    html += '<a href="#" class="action passed">View</a>';
                else
                {
                    if (row.failed == 1)
                        html += '<a href="#" class="action failed">Reinspect</a>';
                    else
                        html += '<a href="#" data-reveal-id="historyReinspection" class="action passed">View</a>';
                }
                html += '</div></td>';
			    html += '</tr>';
			}
			
			html += '</table>';
			
			$("#inspectionScrollWrapper").html(html);
            
            self.setTableWidths();
            
            setTimeout(function()
            {
                objApp.showHideSpinner(false, "#inspectionList");        
            
                if(objUtils.isMobileDevice())        
                {
                    self.scroller = new iScroll('inspectionScrollWrapper', { hScrollbar: false, vScrollbar: true, scrollbarClass: 'myScrollbar'});
                }
            }, 500);            
			
		    
			// Bind click event to list items
            
            $("#tblInspectionListing td.delete").bind("click", function(e)
                {
                    self.is_change_order = true;
					e.preventDefault();
					var inspection_item_id = $(this).parent().attr("rel");
					
					var parent = $(this).parent();

				    
                    var item_name = $(parent).find("td:eq(2)").text();
                    if(confirm("are you sure you wish to delte this inspection for " + item_name))
                    {
                        var sql = "UPDATE inspections " +
                                  "SET deleted = 1, dirty = 1 " +
                                  "WHERE id = ?";
                        objDBUtils.execute(sql, [inspection_item_id], null);
                        self.doInspectionSearch();
                    }
                        
                });
            
            /* 
			$("#tblInspectionListing tr").bind("click", function(e) 
			{
                if (self.is_change_order)
                {
                    self.is_change_order = false;
                    return;
                }
				e.preventDefault();
				
			    // Remove any active states of the list items
			    $(this).parent().parent().parent().find("td").removeClass("active");
			    
			    // Set the active state
			    $(this).parent().parent().addClass("active");
			    
			    // Get the id of the selected client
			    var inspection_id = $(this).attr("rel");
			    
			    // Show the loading indicator
			    blockElement("#tblInspectionListing");
			    
			    // Load the inspection in question
			    objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
			    {
			    	unblockElement("#tblInspectionListing");
			    	
					if(row)
					{
						objApp.objInspection.editInspection(row);	
					}
					
			    }, inspection_id);
			    
			    return false;
			});
             */
            
            $("#tblInspectionListing a.action").click(function(e) 
            {
                e.preventDefault();
                var par = $(this).parent().parent().parent();
                var inspection_id = par.attr('rel');
                var finalised = par.find("td:eq(1) span").hasClass("finalised");
                if(finalised == false)
                {
                    // Show the loading indicator
                    blockElement("#tblInspectionListing");
                    
                    // Load the inspection in question
                    objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
                    {
                        unblockElement("#tblInspectionListing");
                        
                        if(row)
                        {
                            objApp.objInspection.editInspection(row);	
                        }
                        
                    }, inspection_id);
                }
                else
                {
                    var is_pass = $(this).hasClass("passed");
                    if(objApp.blockScreenChange()) return;
                    objApp.keys.inspection_id = inspection_id;
                    if(objApp.keys.inspection_id)
                    {
                        objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
                        {
                            unblockElement("#tblInspectionListing");
                            
                            if(row)
                            {
                                objApp.keys.inspection_id = row.id;
                                objApp.keys.report_type = row.report_type;
                                objApp.keys.builder_id = row.builder_id;
                                objApp.keys.state = row.state;
                                var failed = row.failed;
                                self.setReturnInspectionID(objApp.keys.inspection_id);
                    
                                if (is_pass)
                                {
                                    self.loadHistoryReinspectionItems();
                                    $("#reinspection div.infomation").hide();
                                }
                                else
                                {
                                    var currentdate = new Date(); 
                                    var curdate = currentdate.getFullYear() + "-"
                                                    + (currentdate.getMonth()+1)  + "-" 
                                                    + currentdate.getDate();
                                    self.checkSaveReinspection(objApp.keys.inspection_id, curdate, failed);
                                    self.showReinspection();
                                    $("#reinspection div.infomation").show();
                                }
                                objApp.context = "reinspections";
                            }
                            
                        }, inspection_id);
                    }
                }
			});
            
            
			$("#tblInspectionListingHeader th").unbind();				
			
			$("#tblInspectionListingHeader th").bind(objApp.touchEvent, function(e)
			{
				e.preventDefault();

				var newSortBy = $(this).attr("class");
				
				if(self.sortBy == newSortBy)
				{
					if(self.sortDir == "ASC")
					{
						self.sortDir = "DESC";
					}
					else
					{
						self.sortDir = "ASC";
					}
				}
				else
				{
					self.sortDir = "ASC";	
				}
				
				self.sortBy = newSortBy;
				
				self.doInspectionSearch();
			});
            		
	    }, "");
	}
    
    /***
    * Sets the listing table column widths (headers and cells)
    * as required.
    */
    this.setTableWidths = function()
    {
        // Setup table column widths
        var orientation = objApp.getOrientation();
        var screenWidth = screen.width;
        
        if(orientation == "landscape") {
            screenWidth = screen.height;
        }
        
        var tableWidth = screenWidth - 50;
        $(".scrollWrapper").css("width", tableWidth + 20 + "px");    

        
        var tableHeader = $("#tblInspectionListingHeader");
        var tableBody = $("#tblInspectionListing");
        $(tableHeader).css("table-layout", "fixed");
        $(tableBody).css("table-layout", "fixed");
        $(tableHeader).css("width", tableWidth + "px");
        $(tableBody).css("width", tableWidth + "px");
        
        var width_col1 = Math.floor(tableWidth / 5);
        var width_col2 = width_col1 + 60;
        var width_col3 = width_col1 + 60;
        var width_col4 = width_col1 - 80;
        var width_col5 = width_col1 - 80;
        width_col1 = 30;
        
        $(tableHeader).find("th:eq(0)").css("width", width_col1 + "px");  
        $(tableHeader).find("th:eq(1)").css("width", width_col2 + "px");
        $(tableHeader).find("th:eq(2)").css("width", width_col3 + "px"); 
        $(tableHeader).find("th:eq(3)").css("width", width_col4 + "px");
        $(tableHeader).find("th:eq(4)").css("width", width_col5 + "px");
        
        $(tableBody).find("tr td:eq(0)").css("width", width_col1 + "px");  
        $(tableBody).find("tr td:eq(1)").css("width", width_col2 + "px");
        $(tableBody).find("tr td:eq(2)").css("width", width_col3 + "px");                  
        $(tableBody).find("tr td:eq(3)").css("width", width_col4 + "px");
        $(tableBody).find("tr td:eq(4)").css("width", width_col5 + "px");
    }    
    
    /* new version section */
    this.getStep = function()
    {
        return self.currentStep;
    }
    
    this.setStep = function(step)
    {
        self.currentStep = step;
    }
    
    this.backFromAddClient = function()
    {
        if(!$("#clientDetails").hasClass("hidden"))
		{
			$("#clientDetails").addClass("hidden");
		}
        // Set the main heading
        objApp.setSubHeading("Create a New Inspection");
        objApp.setSubExtraHeading("Step 1 of 3", true);
        
        $("#inspection").removeClass("hidden");
        if(objApp.keys.client_id != "")
		{
            // Setup client and site popselectors
            self.setupPopselectors();
		}    
    }
    
    this.backFromAddSite = function()
    {
        if(!$("#siteDetails").hasClass("hidden"))
		{
			$("#siteDetails").addClass("hidden");
		}
        // Set the main heading
        heading = '';
        objApp.setSubHeading("Create a New Inspection");
        objApp.setSubExtraHeading("Step 1 of 3", true);
        
        $("#inspection").removeClass("hidden");  
    }
    
    this.isTouchDevice = function(){
        try{
            document.createEvent("TouchEvent");
            return true;
        }catch(e){
            return false;
        }
    }
    
    this.touchScroll = function(el){
        if(self.isTouchDevice()){ //if touch events exist...
            //var el=parentNote.getElementById(id);
            var scrollStartPos=0;
    
            el.addEventListener("touchstart", function(event) {
                scrollStartPos=this.scrollTop+event.touches[0].pageY;
            },false);
    
            el.addEventListener("touchmove", function(event) {
                this.scrollTop=scrollStartPos-event.touches[0].pageY;
            },false);
        }
    }
    
    this.showStep1 = function()
    {
        self.setStep(1);
        objApp.clearMain();
        
        // if (self.glDatePicker) {
            // self.glDatePicker.show();
        // }
        
        // If we do not have an active inspection
        if(objApp.keys.inspection_id == "") {
            // hide the coversheet notes button.
            $("a.btnEditNotes").hide();         
            $("a.btnEditClientNotes").hide();
            $("a.btnEditPrivateNotes").hide();
        }
        
        $("#inspection").removeClass("hidden");
        
		// Set the main heading
        if (self.isEditing)
        {
            objApp.setSubHeading("Edit Inspection");
            objApp.setSubExtraHeading("", false);
        }
        else
        {
            objApp.setSubHeading("Create a New Inspection");
            if($("#inspection #report_type").val() == "Quality Inspection")
                objApp.setSubExtraHeading("Step 1 of 4", true);
            else
                objApp.setSubExtraHeading("Step 1 of 3", true);
        }
        
    }
    
    this.showStep2 = function(inspectionItem)
    {
        self.setStep(2);
		// Set the main heading
        objApp.setSubHeading("Add Issues");
        
        if(objApp.keys.report_type == 'Quality Inspection')
        {
            objApp.setSubExtraHeading("Step 2 of 4", true);
        }
        else
        {
            objApp.setSubExtraHeading("Step 2 of 3", true);
        }
        // Show the inspection screen.
        objApp.clearMain();
		$("#inspectionStep2").removeClass("hidden");
        $("#inspectionStep2 textarea#observation").val('');
        $("#inspectionStep2 ul#popAction li:first-child").text('Choose');
        $("#historyModal").hide();
		
        if (inspectionItem) {
            self.initDefectForm(inspectionItem);
        }
        else
        {
            objApp.keys.inspection_item_id = '';
			objApp.keys.location = '';
			objApp.keys.observation = '';
			objApp.keys.action = '';
            
            self.initDefectForm(null);
        }
            	
    }
    
    this.showStep3 = function()
    {
        self.setStep(3);
        
        // Load the inspection object
        objDBUtils.loadRecord("inspections", objApp.keys.inspection_id, function(inspection_id, inspection) {
            if(!inspection) {
                return;    
            }
        }, inspection_id);            
        objApp.setSubHeading("Review Inspection");     
        if(objApp.keys.report_type == 'Quality Inspection')
        {
            objApp.setSubExtraHeading("Step 3 of 4", true);
            $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Email').hide();
            $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
        }
        else
        {
            objApp.setSubExtraHeading("Step 3 of 3", true);
            $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Email').show();
            $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Done');
        }
        
        objApp.clearMain();
        $("#inspectionStep3").removeClass("hidden");
        
        this.handleFinalised();
        
        // Load the defect items for this inspection
		self.loadInspectionItems();
    }
    
    this.showStep4 = function()
    {
        self.setStep(4);
        // Set the main heading
        objApp.setSubHeading("Rate Inspection");
        objApp.setSubExtraHeading("Step 4 of 4", true);
        
        objApp.clearMain();
        $("#inspectionStep4").removeClass("hidden");
        self.setTableWidths2('tblRateListingHeader', 'tblRateListing', 2, 500);
        
    }
    this.showReinspection = function()
    {
        var text = "";
        // Load the inspection object
        objDBUtils.loadRecord("inspections", objApp.keys.inspection_id, function(inspection_id, inspection) {
            if(!inspection) {
                return;    
            }
            else
            {
                text += "LOT" + inspection.lot_no + ". " +  inspection.address + ". " + inspection.suburb;
                objApp.setExtraHeading(text, true);
                if (inspection.failed == 1)
                {
                    $(".inspectionDetails .failed").addClass('active');
                }
                else
                {
                    $(".inspectionDetails .passed").addClass('active');
                }
            }
            
            
            
        }, inspection_id);
        
        
        
        
        this.handleFinalised();
        
        // Load the defect items for this inspection
		self.loadReinspectionItems("", "");
        
    }
    this.doInspectionItemsSearch = function()
    {
        objApp.showHideSpinner(true, "#inspectionList");
            
		// Remove the triangle from the table header cells
		$("#tblDefectListingHeader th .triangle").remove();
		
		// Inject the triangle
		$("#tblDefectListingHeader th[class='" + self.sortBy + "']").append('<span class="triangle ' + self.sortDir + '"></span>');	      	
		
		
		var sql = "SELECT i.*, c.name as client_name, s.address1 || ' ' || s.address2 as site_name " +
			"FROM inspections i " +
			"INNER JOIN clients c ON i.client_id = c.id " +
			"INNER JOIN sites s ON i.site_id = s.id " +
			"WHERE i.deleted = 0 ";
			
		var values = new Array();	    	    	     	    	                      
	    
	    sql += "ORDER BY " + self.itemSortBy + " " + self.itemSortDir + " ";	// Show the most recent inspections first.
	    
	    if((objFilters.recordLimit != "") && (objFilters.recordLimit != "all"))
	    {            
	    	sql += "LIMIT ?";
	    	values.push(objFilters.recordLimit);
	    }		    
	    
	    blockElement("#frmFilters"); 
	    
	    objDBUtils.loadRecordsSQL(sql, values, function(param, items)
	    {
		    // Remove any element block
		    unblockElement("#frmFilters");
			
			if(!items)
            {
                objApp.showHideSpinner(false, "#inspectionList");
				return;	 
            }
		    
			var html = '<table id="tblInspectionListing" class="listing">';
			
			var maxLoop = items.rows.length;
			var r = 0;
			for(r = 0; r < maxLoop; r++)
			{
				var num_defects = 0;
			    var row = items.rows.item(r);
			    var inspDate = objApp.isoDateStrToDate(row.inspection_date);
			    
			    html += '<tr rel="' + row.id + '">';			
			    html += '<td><span class="icon';
			    
			    if(row.finalised)
			    {
					html += ' finalised';
			    }
			    
			    html += '"></span>';
			
			    html += objApp.formatUserDate(inspDate) + '</td>';  
			    html += '<td>' + row.lot_no + ' ' + row.address + ' ' + row.suburb + ' ' + row.postcode + '</td>';
			    html += '<td><div class="i-passed">';
                if (row.failed == 0)
                    html += 'Failed<a href="#" class="failed"></a></div>';
                else
                    html += 'Passed<a href="#" class="passed"></a></div>';
                html += '</div></td>';
                html += '<td><div id="action">';
                if (row.failed == 0)
                    html += '<a href="#" id="action" class="failed">Reinspect</a>';
                else
                    html += '<a href="#" id="action" class="passed">View</a>';
                html += '</div></td>';
			    html += '</tr>';
			}
			
			html += '</table>';         
		    
/* 			Bind click event to list items
			$("#tblInspectionListing tr").bind("click", function(e) 
			{
				e.preventDefault();
				
			    // Remove any active states of the list items
			    $(this).parent().parent().parent().find("td").removeClass("active");
			    
			    // Set the active state
			    $(this).parent().parent().addClass("active");
			    
			    // Get the id of the selected client
			    var inspection_id = $(this).attr("rel");
			    
			    // Show the loading indicator
			    blockElement("#tblInspectionListing");
			    
			    // Load the inspection in question
			    objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
			    {
			    	unblockElement("#tblInspectionListing");
			    	
					if(row)
					{
						objApp.objInspection.editInspection(row);	
					}
					
			    }, inspection_id);
			    
			    return false;
			}); */
			
			$("#tblDefectListingHeader th").unbind();				
			
			$("#tblDefectListingHeader th").bind(objApp.touchEvent, function(e)
			{
				e.preventDefault();

				var newSortBy = $(this).attr("class");
				
				if(self.sortBy == newSortBy)
				{
					if(self.sortDir == "ASC")
					{
						self.sortDir = "DESC";
					}
					else
					{
						self.sortDir = "ASC";
					}
				}
				else
				{
					self.sortDir = "ASC";	
				}
				
				self.sortBy = newSortBy;
				
				self.doInspectionItemsSearch();
			});
            		
	    }, "");
    }
    
    /* end of new version section */

	/***
	* addNewInspection
	* Sets up the main screen area ready for adding a new inspection
	*/	
	this.addNewInspection = function()
	{
		// Clear the main screen area
		objApp.clearMain();
        objApp.cleanup();
		self.inAudit = false;		
		self.lastKeyPress = null;
        self.finalised = 0;
        $('#finalised').val(0);
        self.handleFinalised();
        self.setStep(1);
        self.numImgCurr = 0;
        $(".inspectionDetails #btnCapturePhoto .numImgCurr").text(self.numImgCurr);
        $('#frmInspectionDetails #lot_no').val('');
        $('#frmInspectionDetails #address').val('');
        $('#frmInspectionDetails #suburb').val('');
        $('#frmInspectionDetails #postcode').val('');
        $('#frmInspectionDetails #weather').val('');
        // if (self.glDatePicker) {
            // self.glDatePicker.show();
        // }
        
        // Remove any preset passed/failed indication
        $("a#passed").removeClass('active');
        $("a#failed").removeClass('active');
        
        // Make sure the coversheet notes button is hidden.
        $("a.btnEditNotes").hide();    
        $("a.btnEditClientNotes").hide();
        $("a.btnEditPrivateNotes").hide();            
        $("#inspection #includeclientnotesonreport").val("0");        
		
		// Set the main heading
        objApp.setHeading("Blueprint Inspections");
        objApp.setSubHeading("Create a New Inspection");
        objApp.setSubExtraHeading("Step 1 of 3", true);
		
		// Set the new inspection button to be active
		objApp.setNavActive("#navNewInspection");
		
        
        if(!$("#inspection #btnDeleteInspection").hasClass("hidden"))
		{
			$("#inspection #btnDeleteInspection").addClass("hidden");		
		}
		
        $("#inspection #inspection_no").val('');
		// Set the inspection date and start time to the current date and time
		
		// Visit Date
		var objDate = new Date();
		$("#inspection #inspection_date").val(objApp.formatUserDate(objDate));
		
		// Visit start
		$("#inspection #start").val(objTimePicker.getTimeStr(objDate));
        $("#inspection #startTimer").html(objTimePicker.getTimeStr(objDate));
		
		// Visit Finish
		$("#inspection #finish").val(objTimePicker.getTimeStr(objDate));			
		
		var first_name = localStorage.getItem("first_name");
		var last_name = localStorage.getItem("last_name");
		var user_id = localStorage.getItem("user_id");
		var email = localStorage.getItem("email");
		var initials = localStorage.getItem("initials");   

		if((first_name == null) || (first_name == "") || (last_name == null) || (last_name == "") ||
			(email == null) || (email == "") || (user_id == null) || (user_id == "") || (initials == null) || (initials == ""))
		{
			alert("Sorry, there seems to be some critical data about you missing from your session.  Please login again.");
			objApp.objLogin.logout();
		}
		
		var inspector = first_name + " " + last_name;
		$("#inspection #inspectionInspector").val(inspector);
		$("#inspection #inspectionInspector").attr("readonly", "readonly");
		$("#inspection #initials").val(initials);
		
		$("#inspection #duration").val("0");
		$("#inspection #created_by").val(user_id);
        
        self.setNoteButtonContentIndicators();
		
		// Reset the toggle controls
		$("#toggles").html("");    // Clear the previous renderings out
		
		if(!$("#toggles").hasClass("hidden"))
		{
			// Reset the failed and finalised states
			$("#failed").val("0");
			$("#finalised").val("0");
			
			// Hide the toggles
			$("#toggles").addClass("hidden");
		}
        
        $("#inspectionStep4 #emailTo").val("");
		
		// Show the inspection screen.
		$("#inspection").removeClass("hidden");  
		// Bind events to UI objects
		this.bindEvents();
		// Setup client and site popselectors
		this.setupPopselectors();	
	}
	
	this.editInspection = function(inspection)
	{
        objApp.keys.inspection_id = inspection.id;
        objApp.keys.report_type = inspection.report_type;
        objApp.keys.builder_id = inspection.builder_id;
        objApp.keys.state = inspection.state;
		self.inAudit = false;
		self.lastKeyPress = null;
        self.isEditing = 1;
        
        self.setStep(1);
        
        // if (self.glDatePicker) {
            // self.glDatePicker.show();
        // }

		// Store the inspection_id into local storage, so if the user accidently leaves the app we can return here quickly
		self.setReturnInspectionID(inspection.id);
		
		// Check to see if the user is restricted
		self.restricted = localStorage.getItem("restricted");
		
		self.checkCanDelete();
		
		// Set the app context so we can warn the user about unfinalised inspections.
		objApp.context = "inspection";
		
		if(objApp.keys.inspection_id == "")
			return;
			
		// Hide the filters panel
		objFilters.hide();
			
		// Clear the main screen area
		objApp.clearMain();
		
		// Set the main heading
		objApp.setSubHeading("Edit Inspection");
		
		objApp.setNavActive("#navNewInspection");
		
		// Set the inspection date and start time to the current date and time
		
		// Show the toggle objects
		$("#toggles").removeClass("hidden");	

        $("#inspection #inspection_no").val(inspection.id);
		
		// Inspection Date
		var objDate = objApp.isoDateStrToDate(inspection.inspection_date);
		$("#inspection #inspection_date").val(objApp.formatUserDate(objDate));
		
		// Inspection start
		$("#inspection #start").val(inspection.start);
        $("#inspection #startTimer").html(inspection.start);
		
		// Inspection Finish
		$("#inspection #finish").val(inspection.finish);
		
		$("#inspection #finalised").val(inspection.finalised);
		$("#inspection #failed").val(inspection.failed);
		$("#inspection #initials").val(inspection.initials);
        
        $("#inspection #report_type").val(inspection.report_type);
        $("#inspection #weather").val(inspection.weather);
        $("#inspection #lot_no").val(inspection.lot_no);
        $("#inspection #address").val(inspection.address);
        $("#inspection #suburb").val(inspection.suburb);
        $("#inspection #postcode").val(inspection.postcode);
        
        if (inspection.failed)
        {
            $(".inspectionDetails .failed").addClass('active');
            $(".inspectionDetails .passed").removeClass('active');
        }
        else
        {
            $(".inspectionDetails .failed").removeClass('active');
            $(".inspectionDetails .passed").addClass('active');
        }
        
        this.finalised = false;    
        
        if(inspection.finalised == 1) {
            this.finalised = true;    
        }
        
        this.handleFinalised();
		
		var first_name = localStorage.getItem("first_name");
		var last_name = localStorage.getItem("last_name");
		var user_id = localStorage.getItem("user_id");
		var email = localStorage.getItem("email");

		if((first_name == null) || (first_name == "") || (last_name == null) || (last_name == "") ||
			(email == null) || (email == "") || (user_id == null) || (user_id == ""))
		{
			alert("Sorry, there seems to be some critical data about you missing from your session.  Please login again.");
			objApp.objLogin.logout();
		}
		
		// TODO - we need to load the users table down so we can show the correct inspector name.
		var inspector = first_name + " " + last_name;
		$("#inspection #inspectionInspector").val(inspector);
		$("#inspection #inspectionInspector").attr("readonly", "readonly");
		
		$("#inspection #duration").val(inspection.duration);
		$("#inspection #created_by").val(inspection.created_by);
		
        $("#inspectionStep4 #emailTo").val("");
        
		// Show the inspection screen.
		$("#inspection").removeClass("hidden");
		
		// Bind events to UI objects
		this.bindEvents();	
		
		// Setup client and site popselectors
		this.setupPopselectors();
		
		// Load the defect items for this inspection
		self.loadInspectionItems();
		
		// Show the Add Defect button.
		$("#btnAddDefect").removeClass("hidden");	
        
        self.setStep(3);
        self.showStep3();        	
	}
    
    this.setNoteButtonContentIndicators = function()
    {
        // If each note field has a value, add an asterix to the related button
        // caption to indicate a value.
        var noteFields = {};
        noteFields["notes"] = "btnEditNotes";
        noteFields["privatenotes"] = "btnEditPrivateNotes";
        noteFields["clientnotes"] = "btnEditClientNotes";
        
        for(var key in noteFields) {
            var buttons = $(".inspectionDetails ." + noteFields[key]);
            var e = $("#inspection #" + key);
            var fieldVal = $(e).val();   

            $(buttons).each(function() {
                var label = $(this).text();
        
                var firstChar = label.substring(0, 1);
                    
                if(fieldVal != "") {
                    if(firstChar != "*") {
                        label = "*" + label;
                    }    
                } else {
                    if(firstChar == "*") {
                        label = label.substring(1, label.length);    
                    }    
                }

                $(this).text(label);
            });
        }        
    }
	
	/***
	* Initialises and loads the popselectors
	*/
	this.setupPopselectors = function()
	{
		if(self.objPopBuilders == null)
		{
			self.objPopBuilders = new popselector("#frmInspectionDetails #builder_id", "Choose a builder");
            self.objPopBuilders.callbackMethod = objApp.objInspection.handleBuilderChanged;
        }
        
        if(self.objPopState == null)
		{
			self.objPopState = new popselector("#frmInspectionDetails #state", "Choose a state");
            self.objPopState.callbackMethod = objApp.objInspection.handleStateChanged;
        }
        
        
        self.objPopBuilders.removePopOptions(0, "", "Choose");
        
        // Load builders
		objDBUtils.primaryKey = "id";
		objDBUtils.showColumn = "name";
		objDBUtils.orderBy = "ABS(name) ASC";
        $("#inspection #builder_id").empty();
        $("#inspection #builder_id").append('<li title="">Choose</li>');
        objDBUtils.loadSelect("builders", [], "#inspection #builder_id", function()
		{
			// Builders have finished loading.  Preselect the client if we have a client_id.
			if(objApp.keys.builder_id != "")
			{
				self.objPopBuilders.preselect(objApp.keys.builder_id);
			}
		});  
        
        self.objPopState.preselect(objApp.keys.state); 
	}
	
	/***
	* handleBuilderChanged is called when the user changes the selected
	* builder.  
	*/
	this.handleBuilderChanged = function()
	{
		// Save the inspection if possible
		self.checkSaveInspection();
	}
    
    /***
	* handleBuilderChanged is called when the user changes the selected
	* builder.  
	*/
	this.handleStateChanged = function()
	{
		// Save the inspection if possible
		self.checkSaveInspection();
	}
    
    this.createDatepicker = function(){
        var objDate = objApp.userDateStrToDate($("#inspection #inspection_date").val());
        if (self.glDatePicker){
            $.extend(self.glDatePicker.options,
            {
                selectedDate: objDate,
                firstDate: (new Date(objDate)._first())
            });
            self.glDatePicker.render();
            // self.glDatePicker.show();
        }else{
            self.glDatePicker = $('#inspection #inspection_date').glDatePicker({
                cssName: 'flatwhite',
                selectedDate: objDate,

                onClick: (function(el, cell, date, data) {
                    el.val(objApp.formatUserDate(date));
                    objApp.objInspection.checkSaveInspection();
        		}),
                onBeforeClick: (function(el, cell) {
                    if ($("#finalised").val() == 1)
                    {
                        alert("Sorry, you may not change this value.");
                        return false;
                    }
                    return true;
        		})        
            }).glDatePicker(true);
        }
    }
    
    this.unbindEvents = function()
    {
        // Unbind any previously bound events.
		$("#btnAddDefect").unbind();
		$("#inspection #inspection_date").unbind();
		$("#frmDefectDetails #observation").unbind();
		//$("#inspection #start").unbind();
		//$("#inspection #finish").unbind();
		$("#btnDeleteInspection").unbind();
		$("#frmDefectDetails #notes").unbind();
		$("#print").unbind();
        $(".inspectionDetails .preview").unbind();
        $(".inspectionDetails .finished").unbind();
        $(".inspectionDetails .passed, .inspectionDetails .failed").unbind();
        $(".inspectionDetails #keywords").unbind();
        $(".inspectionDetails #tblDefectListingHeader th").unbind();
        $(".inspectionDetails .gotoStep3").unbind();
        $(".inspectionDetails .gotoStep2").unbind();
        $(".inspectionDetails .gotoStep1").unbind();
        $(".inspectionDetails #btnStep3Next").unbind();
        $(".inspectionDetails #btnStep2Next").unbind();
        $(".inspectionDetails #btnStep1Next").unbind();
        $(".inspectionDetails .addSite").unbind();
        $(".inspectionDetails .addClient").unbind();
        $(".inspectionDetails .itemtype").unbind();
        $(".inspectionDetails .btnEditNotes").unbind();
        $(".inspectionDetails .btnEditClientNotes").unbind();
        $(".inspectionDetails .btnEditPrivateNotes").unbind();
        $(".inspectionDetails #addPhoto-wrapper #addPhoto-btn").unbind();
        $(".inspectionDetails #btnCapturePhoto").unbind();
        $("#tblInspectionListing a.action").unbind();
        $('#inspectionList .btnContainer a#passed').unbind();
        $('#inspectionList .btnContainer a#failed').unbind();
        $(".inspectionDetails a#failed").unbind();
        $(".inspectionDetails a#passed").unbind();
        $("#historyReinspection td a.action").unbind();
        $("#inspection #report_type").unbind();
        $('#reportComments').unbind();
        $(".inspectionDetails #btnStep4Next").unbind();
        $("#reinspection a.passed").unbind();
        $("#reinspection a.failed").unbind();
        $('#reinspection select#rectified').unbind();
    }	
	
	/***
	* bindEvents captures the touch events for the date and time objects
	* and handles them accordingly.
	*/
	this.bindEvents = function()
	{	
		self.unbindEvents()
        // show photoImage to photoList
        if (objApp.keys.inspection_id == "")
        {
            $('#btnCapturePhoto').removeAttr('data-reveal-id');
        }
        else
        {
            $('#btnCapturePhoto').attr('data-reveal-id', 'photoWrapper');
        }
        $("#inspection #report_type").bind('change', function(e)
        {
            e.preventDefault();
            if($(this).val() == "Quality Inspection")
            {
                objApp.setSubExtraHeading("Step 1 of 4", true);
                objApp.keys.report_type = "Quality Inspection";
            }
            else
            {
                objApp.setSubExtraHeading("Step 1 of 3", true);
                objApp.keys.report_type = $(this).val();
            }
        });
        $(".inspectionDetails #btnCapturePhoto").bind(objApp.touchEvent, function(e)
		{
            e.preventDefault();
            if (objApp.keys.inspection_id == "")
            {
                alert("Please create new inspection");
                return;
            }
            self.loadPhotos();
        });
		// add photoImage to photoList
        $(".inspectionDetails #addPhoto-wrapper #addPhoto-btn").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			// Get the current maximum photo sequence number for this inspection item
			var sql = "SELECT MAX(seq_no) as seq_no " +
				"FROM inspectionitemphotos " +
				"WHERE inspection_id = ? " +
				"AND deleted = 0";
				
			objDBUtils.loadRecordSQL(sql, [objApp.getKey("inspection_id")], function(row)
			{
				var seq_no = 1;  // Default sequence number to 1.
				
				if(row)
				{
					seq_no = row.seq_no;
					
					if((seq_no == null) || (seq_no == 0))
					{
						seq_no = 0;
					}
					
					seq_no += 1;			
				}
                

				var editPhoto2 = function(photoData)
				{
					// Setup a new image object, using the photo data as the image source
					objImage = new Image();
                    
                    if(!objApp.phonegapBuild)
                    {
					    objImage.src = 'data:image/jpeg;base64,' + photoData;
                    }
                    else
                    {
					    objImage.src = photoData;
                    }
					
					//notes = "";

					// When the image has loaded, setup the image marker object
					objImage.onload = function() 
					{
 						// Resize the image so it's 600px wide  
						objResizer = new imageResizer(objImage);
						var imageData = objResizer.resize(600); 
						
						objImage = new Image();
						objImage.src = 'data:image/jpeg;base64,' + imageData;
						var notes = "";													
						
						objImage.onload = function() 
						{
 							objImageMarker = new imageMarker(objImage, "Edit Image", notes, function(imageMarkerResult)
 							{                                                      
 								// Handle the save event
 								var imageData = imageMarkerResult.imageData;
 								var notes = imageMarkerResult.notes;	
 								
 								// Create a thumbnail version of the image
								objImage = new Image();
								objImage.src = 'data:image/jpeg;base64,' + imageData;
								
								objImage.onload = function() 
								{								 													
									objResizer = new imageResizer(objImage);
									var thumbData = objResizer.resize(90);
									
									// Save both the thumbnail and the full version to the local file system.
									var fail = function(error)
									{
										alert("storePhotosOnFS::Caught error: " + error.code);
									}
                                    
                                    // Make sure the current inspection id is valid - there seems to be a bug sometimes when the id is corrupted
                                    objDBUtils.loadRecord("inspections", objApp.getKey("inspection_id"), function(param, row)
                                    {
                                        if(!row)
                                        {
                                            alert("The current inspection id is NOT valid");
                                            return;
                                        }
                                        user_id = localStorage.getItem("user_id");
                                        var new_id = objDBUtils.makeInsertKey(objApp.sync_prefix);
                                        
                                        if(!objApp.phonegapBuild)
                                        {
                                            // Save the image data and notes back to the database
                                            var sql = "INSERT INTO inspectionitemphotos(id, inspection_id, seq_no, photodata_tmb, photodata, notes, created_by) " +
                                                "VALUES(?, ?, ?, ?, ?, ?, ?)";
                                            var values = [new_id, objApp.getKey("inspection_id"), seq_no, thumbData, imageData, notes, user_id];
                    
                                            objDBUtils.execute(sql, values, function()
                                            {
                                                // The photo was saved.
                                                // Reload the photos
                                                self.loadPhotos();
                                            });                                              
                                        }
                                        else
                                        {
                                            // Phonegap build - save the images to the file system
                                            // Request access to the file system
                                            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
                                            {
                                                var file_name = new_id + "_thumb.jpg";
                                                
                                                // Get permission to write the file
                                                fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
                                                {
                                                    // Create the file write object
                                                    fileEntry.createWriter(function(writer)
                                                    {
                                                        writer.onwriteend = function(evt) 
                                                        {
                                                            // Get the file URI for the thumbnail image
                                                            var uri_thumb = fileEntry.toURI();    

                                                            // Now write the full image to the file system
                                                            var file_name = new_id + ".jpg";
                                                            
                                                            fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
                                                            {
                                                                // Create the file write object
                                                                fileEntry.createWriter(function(writer)
                                                                {
                                                                    writer.onwriteend = function(evt) 
                                                                    {
                                                                        // Get the file URI for the thumbnail image
                                                                        var uri = fileEntry.toURI();
                                                                        
                                                                        // Save the image data and notes back to the database
                                                                        var sql = "INSERT INTO inspectionitemphotos(id, inspection_id, seq_no, photodata_tmb, photodata, notes, created_by) " +
                                                                            "VALUES(?, ?, ?, ?, ?, ?, ?)";
                                                                        var values = [new_id, objApp.getKey("inspection_id"), seq_no, uri_thumb, uri, notes, user_id];
                                                
                                                                        objDBUtils.execute(sql, values, function()
                                                                        {
                                                                            // The photo was saved.
                                                                            // Reload the photos
                                                                            self.loadPhotos();
                                                                        });                                                                                                                            
                                                                        
                                                                    };
                                                                    
                                                                    writer.write(imageData);
                                                                    
                                                                }, fail);
                                                                
                                                            }, fail); 
                                                                                
                                                        };
                                                        
                                                        // Write the thumbnail data to the file.
                                                        writer.write(thumbData);
                                                        
                                                    }, fail);
                                                        
                                                }, fail);
                                                            
                                            }, fail); 
                                        }                                            
                                        
                                        
                                        
                                    }, "");  									
								}
 							}, function(t){}, "", self.finalised);
 							
 							objImageMarker.show();								
						}						
					}					
				}
				
				if(objApp.phonegapBuild)
				{
					// Invoke the camera API to allow the user to take a photo
					navigator.camera.getPicture(function(imageData)
					{
						// The image data will be a file URI
						// Show the photo in the image editor.
						editPhoto2(imageData);
							
					}, function(message)
					{
						alert("Image capture failed because: " + message);	
                    }, 
                    { 
                        quality: 40, 
                        destinationType : Camera.DestinationType.FILE_URI, 
                        sourceType : Camera.PictureSourceType.CAMERA,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 640,
                        targetHeight: 480,
                        saveToPhotoAlbum: false,
                        correctOrientation: true
                    }); 					
				}
				else
				{
                    var imageData = "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";
                    
                    editPhoto2(imageData);
				}
			});
		});
		
		// Figure out if this inspection is currently finalised or not.
		self.finalised = $("#frmInspectionDetails #finalised").val();
		
		// make sure we scroll back down after the user has finished typing.
		$("#frmDefectDetails #notes").bind("blur", function()
		{
			objApp.scrollTop();
		});	
        
        self.createDatepicker();
		
        /*
		// Capture the event when the user taps on the inspection date field
		$("#inspection #inspection_date").bind("click", function(e)
		{
			e.preventDefault();
			
			// Remove the focus from the textfield.
			$(this).blur();
			
			if(self.finalised == 1) return;
			
			// If there is a date in the inspection date field,
			// Convert it to a date object and preselect the date in the 
			// date picker
			if($("#inspection #inspection_date").val() != "")
			{
				// Convert the date which is currently in the users format into a date object.
				var objDate = objApp.userDateStrToDate($("#inspection #inspection_date").val());
				
				// If a valid date object was returned, set the date in the picker.
				if(objDate != null)
				{
					objDatePicker.selectedDate = objDate;
					objDatePicker.year = objDate.getFullYear();
					objDatePicker.month = objDate.getMonth();
				}				
			}
			    
			objDatePicker.callbackMethod = objApp.objInspection.checkSaveInspection; 
			
			// Show the date picker.
			setTimeout('objDatePicker.show($("#inspection #inspection_date"));', 200);
			
			return false;				
		});
        */
        
        $(".inspectionDetails .addClient").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            if(!$("#inspection").hasClass("hidden"))
    		{
    			$("#inspection").addClass("hidden");
    		}
            objApp.objClients.setupAddNewClient();
			return false;
		});
        
        $(".inspectionDetails .addSite").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            if(!$("#inspection").hasClass("hidden"))
    		{
    			$("#inspection").addClass("hidden");
    		}
            objApp.objSites.setupAddNewSite();
			return false;
		});
        
        $(".inspectionDetails #btnStep1Next").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            
            if(self.objPopBuilders.getValue() == "")
            {
                alert("Please select a builder");
                return;
            }      
            if ($('#frmInspectionDetails #weather').val() == "")
            {
                alert("Please enter weather conditions");
                return;
            }
            if ($('#frmInspectionDetails #lot_no').val() == "")
            {
                alert("Please input a lot_no");
                return;
            }
            if ($('#frmInspectionDetails #address').val() == "")
            {
                alert("Please input a address");
                return;
            }
            if ($('#frmInspectionDetails #suburb').val() == "")
            {
                alert("Please input a suburb");
                return;
            }
            if ($('#frmInspectionDetails #postcode').val() == "")
            {
                alert("Please input a postcode");
                return;
            }
            if(self.objPopState.getValue() == "")
            {
                alert("Please select a state");
                return;
            }
			
            self.showStep2();
			return false;
		});
        
        $(".inspectionDetails #btnStep2Next").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            // if(objApp.getKey("inspection_item_id") != "")
			{
				self.saveDefect();
			}	
            self.showStep3();
			return false;
		});
        
        $(".inspectionDetails #btnStep3Next").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            if (!$(".inspectionDetails .failed").hasClass('active') &&
                 !$(".inspectionDetails .passed").hasClass('active'))
            {
                alert("Please select the status Passed or Failed");
                return false;
            }
            var inspection_id = objApp.keys.inspection_id;
	    console.log(inspection_id);
            var sql = "SELECT * FROM reinspections WHERE inspection_id = ? AND inspection_type = 'Original'";
            objDBUtils.loadRecordsSQL(sql, [inspection_id], function(param, items){
                if(!items)
                {
                    var failed = 1;
                    if($(".inspectionDetails .passed").hasClass('active'))
                    {
                        failed = 0;
                    }
                    var currentdate = new Date(); 
                    var curdate = currentdate.getFullYear() + "-"
                                    + (currentdate.getMonth()+1)  + "-" 
                                    + currentdate.getDate();
                    var primaryKey = objDBUtils.makeInsertKey(objApp.sync_prefix);
                    var values = [primaryKey, inspection_id, curdate, failed, 'Original'];
                    sql = "INSERT INTO reinspections(id, inspection_id, reinspection_date, failed, inspection_type) VALUES(?,?,?,?,?)";
                    objDBUtils.execute(sql, values, function(){
                        console.log("Insert reinspection success");
                    });
                    sql = "SELECT * FROM inspectionitems WHERE inspection_id = ?";
                    objDBUtils.loadRecordsSQL(sql, [inspection_id], function(param, items)
                    {
                        if(!items)
                        {
                            return;
                        }
                        else
                        {
                            var maxLoop = items.rows.length;
                            var r = 0;
                            
                            for(r = 0; r < maxLoop; r++)
                            {
                                values = [];
                                var row = items.rows.item(r);
                                sql = "INSERT INTO reinspectionitems(id,reinspection_id, inspectionitem_id, rectified) " +
                                      "VALUES(?,?,?,?)";
                                var primaryKey1 = objDBUtils.makeInsertKey(objApp.sync_prefix) + r;
                                values = [primaryKey1, primaryKey, row.id, row.rectified];
                                objDBUtils.execute(sql, values, function(){
                                    console.log("Insert reinspectionitem success");
                                });
                            }    
                        }
                    },"");
                }
                
            }, "");
            if(objApp.keys.report_type == 'Quality Inspection')
                self.showStep4();
            else
            {
                objApp.cleanup();
                self.setReturnInspectionID("");
                
                self.setupInspections();
                objApp.context = "inspections";
            }
            
			return false;
		});
        
        $(".inspectionDetails #btnStep4Next").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            if (!$(".inspectionDetails .failed").hasClass('active') &&
                 !$(".inspectionDetails .passed").hasClass('active'))
            {
                alert("Please select the status Passed or Failed");
                return false;
            }
            objApp.cleanup();
            self.setReturnInspectionID("");
            
            self.setupInspections();
            objApp.context = "inspections";
			return false;
		});
        
        $(".inspectionDetails .gotoStep1").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            self.showStep1();
			return false;
		});
        
        $(".inspectionDetails .gotoStep2").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            self.showStep2();
			return false;
		});
        
        $(".inspectionDetails .gotoStep3").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            self.showStep3();
			return false;
		});
        
        $(".inspectionDetails #tblDefectListingHeader th").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

			var newSortBy = $(this).attr("class");
			
			if(self.itemSortBy == newSortBy)
			{
				if(self.itemSortDir == "ASC")
				{
					self.itemSortDir = "DESC";
				}
				else
				{
					self.itemSortDir = "ASC";
				}
			}
			else
			{
				self.itemSortDir = "ASC";	
			}
			
			self.itemSortBy = newSortBy;
			
			self.loadInspectionItems();
		});
        
        $(".inspectionDetails #keywords").bind("keyup", function(){
            self.loadInspectionItems();
        });
        
        $(".inspectionDetails #keywords").bind("blur", function(){
            objApp.scrollTop();
        });
        
        $(".inspectionDetails .passed, .inspectionDetails .failed").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            
            if (self.finalised == 1) {
                return false;
            }
            
            if ($(this).hasClass('active')) {
                return false;
            }
            else
            {
                $(this).addClass('active');
                
                if ($(this).hasClass('passed'))
                {
                    $(".inspectionDetails .failed").removeClass('active');
                    $("#failed").val("0");
                }
                else
                {
                    $(".inspectionDetails .passed").removeClass('active');
                    $("#failed").val("1");
                }
            }
            return false;
        });
        
        $(".inspectionDetails .finished").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            
            if (!$(".inspectionDetails .failed").hasClass('active') &&
                 !$(".inspectionDetails .passed").hasClass('active'))
            {
                alert("Please select the status Passed or Failed");
                return false;
            }
            
            if ($(this).hasClass('active'))
            {
                // The inspection is NOT finalised.
                $("#finalised").val(0);
                self.finalised = 0;   
                self.handleFinalised();
            }
            else
            {
                $("#finalised").val(1);
                self.finalised = 1;   
                self.handleFinalised();
            }
  			
			// Update the finish time of the audit
			var objDate = new Date();
			var objTimePicker = new Timepicker();
			$("#inspection #finish").val(objTimePicker.getTimeStr(objDate));  			
  			
			objApp.objInspection.checkSaveInspection();
			
			setTimeout(function()
			{
				objApp.objInspection.loadInspectionItems();
			}, 500);
            return false;
            
        });
        
        $(".inspectionDetails .preview").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

			// Show the loader graphic
			blockElement(".inspectionDetails");
			
			objApp.objSync.startSyncSilent(function(success)
			{
				if(success)
				{
					// The silent sync has completed successfully.
					// We can now launch the report.
					unblockElement(".inspectionDetails");
                    
                    // Create a token
                    var params = {};
                    params["email"] = localStorage.getItem("email");
                    params["password"] = localStorage.getItem("password");
                    
                    var url = objApp.apiURL + "account/create_token/" + Math.floor(Math.random() * 99999);
                    blockElement(".inspectionDetails");
                    
                    $.post(url, params, function(data)
                    {
                        unblockElement(".inspectionDetails"); 
                        
                        try {
                            data = jQuery.parseJSON(data);
                            
                            if(data.status != "OK")
                            {
                                alert("Unable to create access token");
                                return;
                            }
                            
                            var token = data.message;                   
                        
						
                            if(objApp.keys.report_type == 'Handovers')
                                var downloadURL = objApp.apiURL + "reports/print_report_handovers/" + objApp.keys.inspection_id + "?token=" + token;
                            else if(objApp.keys.report_type == 'Quality Inspection')
                                var downloadURL = objApp.apiURL + "reports/print_report_quality/" + objApp.keys.inspection_id + "?token=" + token;
                            else
                                var downloadURL = objApp.apiURL + "reports/print_report_pci/" + objApp.keys.inspection_id + "?token=" + token;
                            if(objApp.phonegapBuild)
                            {
                                if(cb != null)
                                {     
                                    window.plugins.childBrowser.showWebPage(downloadURL);
                                }                            
                            }
                            else
                            {
                                $.download(downloadURL, [], "post");
                            }                            
                            
                        } catch (e) {
                            // error
                            alert("Sorry, something went wrong whilst trying to preview the report.");
                            return;
                        }                        
                    }, "");
				}
				else
				{
					unblockElement(".inspectionDetails");
					alert("Sorry, something went wrong whilst syncing your data back to the Planet Earth server.  Please try again later.");
				}
			});
		});	
        
        $(".historySection #viewHistory").bind(objApp.touchEvent, function(e)
        {
            e.preventDefault();
            self.showHistoryModal();
        });
        
        $('#reportComments').bind('blur', function(){
            objApp.scrollTop();
            $("#inspection #notes").val($(this).val());
            objApp.objInspection.checkSaveInspection();
        });
        
        $('.btnEditNotes').bind(objApp.touchEvent, function(e){
            e.preventDefault();
            var objNoteModal = new noteModal("Coversheet Notes", $("#inspection #notes").val(), function(notes)
			{
				// The user has updated the notes value.
				// Update the toggle (and therefore the form) with the new value.
				$("#inspection #notes").val(notes);
                self.setNoteButtonContentIndicators();
				objApp.objInspection.checkSaveInspection();
			});
			
			objNoteModal.show();
			
			if(self.finalised == 1)
			{
				objNoteModal.setReadOnly();
			}
        });
        
        $('.btnEditClientNotes').bind(objApp.touchEvent, function(e){
            e.preventDefault();
            var objNoteModal = new noteModal("Client Comments", $("#inspection #clientnotes").val(), function(notes)
            {
                // The user has updated the notes value.
                // Update the toggle (and therefore the form) with the new value.
                $("#inspection #clientnotes").val(notes);
                self.setNoteButtonContentIndicators();
                objApp.objInspection.checkSaveInspection();
            });
            
            objNoteModal.setShowRecipients(true);
            objNoteModal.setIncludeOnReportSelector("#includeclientnotesonreport");
            
            objNoteModal.show();
            
            if(self.finalised == 1)
            {
                objNoteModal.setReadOnly();
            }
        }); 
        
        
        $('#frmInspectionDetails #lot_no').change(function(){
            self.updateExtraSubHeader();
            self.checkSaveInspection();
           });
        
        $('#frmInspectionDetails #address').change(function(){
            self.updateExtraSubHeader();
            self.checkSaveInspection();
           });
        $('#frmInspectionDetails #suburb').change(function(){
            self.updateExtraSubHeader();
            self.checkSaveInspection();
           });
        // $('#frmInspectionDetails #postcode').change(function(){
            // self.updateExtraSubHeader();
            // self.checkSaveInspection();
           // });
        $('#frmInspectionDetails #weather').change(function(){
            self.checkSaveInspection();
        });
        
        $("body").on("click", "#frmDefectDetails #observation_suggestion tr td" , function() {
			var selectedTxt = $(this).text();
            $('#frmDefectDetails #observation').val(selectedTxt);
        });
        
        
        $('.btnEditPrivateNotes').bind(objApp.touchEvent, function(e){
            e.preventDefault();
            
            var objNoteModal = new noteModal("Private Notes", $("#inspection #privatenotes").val(), function(notes)
            {
                // The user has updated the notes value.
                // Update the toggle (and therefore the form) with the new value.
                $("#inspection #privatenotes").val(notes);
                self.setNoteButtonContentIndicators();
                objApp.objInspection.checkSaveInspection();
            });
            
            objNoteModal.show();
            
            if(self.finalised == 1)
            {
                objNoteModal.setReadOnly();
            }
        });                
        
        $('#emailTo').bind('blur', function(){
            objApp.scrollTop();
        });
        
		/***
		* Capture the event when the user clicks on the Add Issue button
		*/
		$("#btnAddDefect").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            // if(objApp.getKey("inspection_item_id") != "")
			{
				self.saveDefect(function(){
                    $("#inspectionStep2 textarea#observation").val('');
                    $("#inspectionStep2 ul#popAction li:first-child").text('Choose');
                    // Clear all defect related keys
                    objApp.keys.inspection_item_id = "";
                    objApp.keys.observation = '';
                    objApp.keys.action = '';
                    // When adding a new defect, hide the delete defect button
                    $("#btnDeleteDefect").css("visibility", "hidden");
                    
                    // Initialise defect form.
                    self.initDefectForm(null);
                });
			}
            
			
			return false;
		});
		
		/***
		* Capture the event when the user clicks on the delete inspection button
		*/		
		$("#main #btnDeleteInspection").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			if(objApp.keys.inspection_id == "") return;
			
			if(!confirm("Delete this inspection and all related photos and issues?"))
			{
				return true;				
			}
			
			blockElement("#frmInspectionDetails"); 
			
			// Delete related inspectionitemphotos
			var sql = "UPDATE inspectionitemphotos " +
				"SET deleted = 1, dirty = 1 " +
				"WHERE inspection_id = ?";
				
			objDBUtils.execute(sql, [objApp.keys.inspection_id], null);					
			
			// Delete related inspectionitems
			var sql = "UPDATE inspectionitems " +
				"SET deleted = 1, dirty = 1 " +
				"WHERE inspection_id = ?";

			objDBUtils.execute(sql, [objApp.keys.inspection_id], null);
			
			// Delete this inspection
			var sql = "UPDATE inspections " +
				"SET deleted = 1, dirty = 1 " +
				"WHERE id = ?";

			objDBUtils.execute(sql, [objApp.keys.inspection_id], null);	
			
			setTimeout(function()
			{
				// Now move back to the inspection listing screen.
				self.setupInspections();				
				
				unblockElement("#frmInspectionDetails");	
			}, 500);		
		});	
        
        $("a.itemtype").bind(objApp.touchEvent, function(e) {
            if($(this).hasClass("acknowledgement")) {
                $(this).removeClass("acknowledgement");
                $("#itemtype").val("0");    
            } else {
                $(this).addClass("acknowledgement");    
                $("#itemtype").val("1");
            }
            
            self.saveDefect();
        });	
	
		// Handle the event when the user clicks on the PRINT button
		// to print the inspection report.
		$("#print").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			self.showPrintModal();
		});
        
        $("#rateScrollWrapper #brickwork").change(function(){
            SaveRateTotalInspections();
            
            self.checkSaveRateInspection();
        });
        $("#rateScrollWrapper #paint_quality").change(function(){
            SaveRateTotalInspections();
            
            self.checkSaveRateInspection();
        });
        $("#rateScrollWrapper #plaster_quality").change(function(){
            SaveRateTotalInspections();
            
            self.checkSaveRateInspection();
        });
        $("#rateScrollWrapper #interior_quality").change(function(){
            SaveRateTotalInspections();
            
            self.checkSaveRateInspection();
        });
        $("#rateScrollWrapper #exterior_quality").change(function(){
            SaveRateTotalInspections();
            
            self.checkSaveRateInspection();
        });
        
        function SaveRateTotalInspections()
        {
            var brickwork = parseInt($('#inspectionStep4 #brickwork').val());
            var paintQuality = parseInt($('#inspectionStep4 #paint_quality').val());
            var plasterQuality = parseInt($('#inspectionStep4 #plaster_quality').val());
            var interiorQuality = parseInt($('#inspectionStep4 #interior_quality').val());
            var exteriorQuality = parseInt($('#inspectionStep4 #exterior_quality').val());
            var total = brickwork + paintQuality + plasterQuality + interiorQuality + exteriorQuality;
            $('#inspectionStep4 #total').text(total + '/25');
        }
		
		// Setup toggle controls
  		var objToggleNotes = new toggleControl("toggleNotes", "#frmInspectionDetails #notes", "text", "Notes", function()
  		{
			var objNoteModal = new noteModal("Inspection Notes", objToggleNotes.getValue(), function(notes)
			{
				// The user has updated the notes value.
				// Update the toggle (and therefore the form) with the new value.
				objToggleNotes.setValue(notes);
				objApp.objInspection.checkSaveInspection();
			});
			
			objNoteModal.show();
			
			if(self.finalised == 1)
			{
				objNoteModal.setReadOnly();
			}
  		});
  		  
  		self.objToggleFailed = new toggleControl("toggleFailed", "#frmInspectionDetails #failed", "binary", "Failed", function()
  		{
            objApp.objInspection.checkSaveInspection();	
  		});
        $(".inspectionDetails a#failed").click(function(e) {
            e.preventDefault();
            
            if(self.finalised == 0) {
                if(objApp.context == "reinspections")
                {
                    $("#reinspection input#failed").val(1);
                    objApp.objInspection.checkUpdateInspection();
                }
                else
                    objApp.objInspection.checkSaveInspection();
                    
            }
        });
        
        $(".inspectionDetails a#passed").click(function(e) {
            e.preventDefault();
            
            if(self.finalised == 0) {
            if(objApp.context == "reinspections")
            {
                $("#reinspection input#failed").val(0);
                objApp.objInspection.checkUpdateInspection();
            }
            else
                objApp.objInspection.checkSaveInspection();
            }
        }); 
        
               
  		
  		var objToggleFinalised = new toggleControl("toggleFinalised", "#frmInspectionDetails #finalised", "binary", "Finalised", function()
  		{
  			self.finalised = $("#finalised").val();
  			self.setReadOnly();
  			
			// Update the finish time of the audit
			var objDate = new Date();
			var objTimePicker = new Timepicker();
			$("#inspection #finish").val(objTimePicker.getTimeStr(objDate));  			
  			if(objApp.context == "reinspections")
            {
                $("#reinspection input#failed").val(1);
                objApp.objInspection.checkUpdateInspection();
            }
            else
                objApp.objInspection.checkSaveInspection();
                 
			setTimeout(function()
			{
				objApp.objInspection.loadInspectionItems();
			}, 500);
  		});
  		
  		// If the user is restricted, prevent them 
  		if((self.restricted == 1) && (self.finalised == 1))
  		{
			objToggleFinalised.preventToggle = true;	
			self.objToggleFailed.preventToggle = true;
  		}
  		
  		if(self.finalised == 1)
  		{
			self.objToggleFailed.preventToggle = true;
  		}  		
  		
  		// Render toggle controls
  		$("#toggles").html("");
  		objToggleNotes.render("#toggles");
  		self.objToggleFailed.render("#toggles");
  		objToggleFinalised.render("#toggles");  				
	}
    
    
    this.updateExtraSubHeader = function()
	{
        var text = '';
        var lot = $('#frmInspectionDetails #lot_no').val();
        var address = $('#frmInspectionDetails #address').val();
        var suburb = $('#frmInspectionDetails #suburb').val();
        // var postcode = $('#frmInspectionDetails #postcode').val();
        // var state = self.objPopState.getText();
        text = 'LOT ' + lot + ', ' +address + ', ' + suburb;
        // alert(text);
		objApp.setExtraHeading(text, true);
	}

	this.deleteLocation = function(ID)
	{
		objDBUtils.deleteRecord("resources", ID, function()
		{
			self.objPopLocation.removeOption(ID);
		});
	}
    
    this.deleteAction = function(ID)
    {
        objDBUtils.deleteRecord("resources", ID, function()
        {
            self.objPopAction.removeOption(ID);
        });
    } 
    
    this.deleteIssue = function(ID)
    {
        objDBUtils.deleteRecord("resources", ID, function()
        {
            self.objPopIssue.removeOption(ID);
        });
    }
    
    this.deleteDetail = function(ID)
    {
        objDBUtils.deleteRecord("resources", ID, function()
        {
            self.objPopDetail.removeOption(ID);
        });
    }           
	
	/***
	* initDefectForm
	* This method shows the defect form in the right sidebar and then
	* resets the popSelectors and loads their values as appropriate.
	* If an existing defect is being shown, the defect values are preselected.
	*/
	this.initDefectForm = function(inspectionItem)
	{	
		self.lastKeyPress = null;
		self.doingSave = false;
		
		// Show the defect form
		$("#defect").removeClass("hidden");	
		
		// Unbind key events
		$("#btnCapturePhoto").unbind();	
		//$("#btnSaveDefect").unbind();
		$("#btnDeleteDefect").unbind();
		$("#notes").unbind(); 
        $("#frmDefectDetails #observation").unbind();
        
        if(!$(".inspectionDetails .historySection").hasClass("hidden"))
		{
			$(".inspectionDetails .historySection").addClass("hidden");
		}
		
		var user_id = localStorage.getItem("user_id");	
		
		// If an inspection item has been passed through, set the notes from it, otherwise initialise to blank.
		if(inspectionItem == null)
		{
			$("#frmDefectDetails #notes").val("");
			$("#frmDefectDetails #created_by").val(user_id);
            $("#frmDefectDetails #itemtype").val("0");
            $("#frmDefectDetails #numrepeats").val("0");
			
			// if(!$("#photoWrapper").hasClass("hidden"))
			// {
				// $("#photoWrapper").addClass("hidden");
			// }
			
			// Get the next inspectionitems sequence number for this audit
			var sql = "SELECT MAX(seq_no) as seq_no " + 
				"FROM inspectionitems " + 
				"WHERE inspection_id = ? AND deleted = 0";
				
			objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
			{
				var seq_no = 1;
				
				if((row) && (row.seq_no != null)) 
				{
					seq_no = row.seq_no + 1;
				}	
				
				// Set the sequence number into the form.
				$("#frmDefectDetails #seq_no").val(seq_no);
			});			
		}
		else
		{
			$("#frmDefectDetails #notes").val(inspectionItem.notes);
            self.touchScroll(document.querySelector("#frmDefectDetails #notes"));
			$("#frmDefectDetails #created_by").val(inspectionItem.created_by);
			$("#frmDefectDetails #seq_no").val(inspectionItem.seq_no);
			$("#photoWrapper").removeClass("hidden");
            $("#frmDefectDetails #itemtype").val(inspectionItem.itemtype);
            $("#frmDefectDetails #numrepeats").val(inspectionItem.numrepeats);
		}
        
        if($("#frmDefectDetails #itemtype").val() == "1") {
            $("a.itemtype").addClass("acknowledgement");
        } else {
            $("a.itemtype").removeClass("acknowledgement");    
        }
		
   		// Setup defect pop selectors
		if(self.objPopLocation == null)
		{
			// The pop selectors have not been initialised yet.
			self.objPopLocation = new popselector("#frmDefectDetails #popLocation", "Please select a location"); 
			
			self.objPopLocation.callbackMethod = objApp.objInspection.handleLocationChanged;
			
			self.objPopLocation.addNewMethod = self.addNewLocation;
			
			self.objPopLocation.deleteCallback = self.deleteLocation;
		}
        
        if(self.objPopAction == null)
		{
			// The pop selectors have not been initialised yet.
			self.objPopAction = new popselector("#frmDefectDetails #popAction", "Please select an action"); 
			
			self.objPopAction.callbackMethod = objApp.objInspection.handleActionChanged;
			
			self.objPopAction.addNewMethod = self.addNewAction;
			
			self.objPopAction.deleteCallback = self.deleteAction;
		}
		
		// If the user is in an audit (i.e, the have actively saved a defect), do NOT reset the level and area pop selectors.
		$("#frmDefectDetails #observation_suggestion").empty();
        if((self.inAudit) && (inspectionItem == null))
		{

 			self.loadPhotos();											
		}
		else
		{
			// The user is NOT in an audit, clear all pop selectors.
			// Clear any existing pop filter options.
			self.objPopLocation.removePopOptions(0, "", "Choose");
			self.objPopAction.removePopOptions(0, "", "Choose");
			
			// Load available levels into the pop selector
			objDBUtils.primaryKey = "id";
			objDBUtils.showColumn = "name";
			objDBUtils.orderBy = "name ASC";
			
			var filters = [];
			filters.push(new Array("resource_type = 1"));
			
			objDBUtils.loadSelect("resources", filters, "#frmDefectDetails #popLocation", function()
			{
				if(objApp.keys.location != "")
				{
					self.objPopLocation.preselectByText(objApp.keys.location);
				}
				else
				{
					self.objPopLocation.clear("", "Choose");	
				}
				
				if(inspectionItem != null)
				{
 					self.loadHistory(inspectionItem.level, inspectionItem.area, inspectionItem.issue, inspectionItem.detail);
 					self.loadPhotos();
				}	
				else
				{
					if(!$("#historyWrapper").hasClass("hidden"))
					{
						$("#historyWrapper").addClass("hidden");
					}
				}			
			});	
            
            
            var filters = [];
			filters.push(new Array("resource_type = 2"));
			
			objDBUtils.loadSelect("resources", filters, "#frmDefectDetails #popAction", function()
			{
				if(objApp.keys.action != "")
				{
					self.objPopAction.preselectByText(objApp.keys.action);
				}
				else
				{
					self.objPopAction.clear("", "Choose");	
				}	
			});
            objDBUtils.orderBy = "";
        }
							
		
		// ************************** SAVE DEFECT ********************************
		// ***********************************************************************
		/*
		$("#btnSaveDefect").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			self.saveDefect(); 
		});*/
		
		// ************************** DELETE DEFECT ********************************
		// ***********************************************************************
		$("#btnDeleteDefect").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			if(!confirm("Are you sure you want to delete this issue?  Once the issue has been deleted you cannot recover it."))
			{
				return false;
			}
			
			self.deleteDefect(objApp.getKey("inspection_item_id"));
		});		
		
		// If the ipad has scrolled to show the notes field,
		// make sure we scroll back down after the user has finished typing.
		
		$('#frmDefectDetails #observation').bind('keyup', function(e)
		{
                objDBUtils.orderBy = "";
                self.observation = $('#frmDefectDetails textarea#observation').val();
				$("#frmDefectDetails #observation_suggestion").empty();
                if(self.observation == ''){
                    return false;
                }
                var filters = [];
                filters.push(new Array("resource_type = 3"));
                filters.push(new Array("name LIKE '%" + self.observation + "%'"));
                objDBUtils.loadSelect("resources", filters, "#frmDefectDetails #observation_suggestion", function()
                {
                    // TODO
                    console.log('load oservation suggession finish 1');
                }, 'td');
		});
		              
		
		
		self.setReadOnly();
	}
	
	/***
	* Delete the specified inspection item (defect)
	* We need to delete all related inspection item photos, and then the inspection item itself
	*/
	this.deleteDefect = function(item_id)
	{
		// Flag all related photo records as deleted.
		var sql = "UPDATE inspectionitemphotos " +
			"SET deleted = 1, dirty = 1 " +
			"WHERE inspection_id = ?";
			
		objDBUtils.execute(sql, [item_id], function()
		{
			// Now delete the inspection item record itself
			objDBUtils.deleteRecord("inspectionitems", item_id, function()
			{
				// Final step is to update the inspection record with the correct stats.
				// Get the number of defects associated with this inspection
				var sql = "SELECT COUNT(*) as num_defects " +
				    "FROM inspectionitems " +
				    "WHERE inspection_id = ? AND deleted = 0";
				    
				objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
				{
					if(row)
					{
						// Now update the parent inspection record with the defect count.
						var num_defects = row.num_defects;
						
						sql = "UPDATE inspections " +
							"SET num_defects = ?, dirty = 1 " +
							"WHERE id = ?";
							
						objDBUtils.execute(sql, [num_defects, objApp.keys.inspection_id], function()
						{
							// Hide the delete button
							$("#btnDeleteDefect").css("visibility", "hidden");
							
							// Reload the inspection items listing
							self.loadInspectionItems();
						
							// Hide the defect panel
							$("#defect").addClass("hidden");							
														
						});
					}
				});				
			});				
		});	
	}
    
    /***
	* Delete the specified image item (defect)
	* We need to delete the photo
	*/
	this.deleteImage = function(item_id)
	{
        if (item_id == "")
            return;
            
		// Flag all related photo records as deleted.
		var sql = "UPDATE inspectionitemphotos " +
			"SET deleted = 1, dirty = 1 " +
			"WHERE id = ?";
			
		objDBUtils.execute(sql, [item_id], function()
		{
			// Reload the inspection photos listing
            self.loadPhotos();
		});	
	}
	
	this.doDelayedSave = function()
	{
		var now = new Date();
		
		var diff = now - self.lastKeyPress;
		
		if(diff < 1500)
		{
			setTimeout('objApp.objInspection.doDelayedSave()', 100);
		}
		else
		{
			if(!self.doingSave)
			{
				self.doingSave = true;
                self.handleIssueChanged();
			}		
		}
	}
	
	this.loadPhotos = function()
	{
        if(objApp.getKey("inspection_id") == "")
		{
			$("#photoWrapper #photoList").html("<p>This item has no photos.</p>");
			return;
		}
		
		objDBUtils.orderBy = "seq_no ASC";
		
		var filters = [];
		filters.push(new Array("inspection_id = '" + objApp.getKey("inspection_id") + "'"));
        
		objDBUtils.loadRecords('inspectionitemphotos', filters, function(param, items)
		{
			if(!items)
			{
                $("#photoWrapper #photoList").html("<p>This item has no photos.</p>");
				return;
			}
			
			// Loop through the items, building the output list as we go.
			var maxLoop = items.rows.length;
            self.numImgCurr = maxLoop;
            $(".inspectionDetails #btnCapturePhoto .numImgCurr").text(self.numImgCurr);
			var r = 0;
			var num_items = 0;   
			
			var html = '<ul class="gallery">';
			
			if(objApp.phonegapBuild)
			{
				var fail = function(error)
				{
					alert("loadPhotos::Caught error: " + error.code);
				}
												
				// Request access to the file system
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
				{				
					// We have access to the file system.
					
					// Define the function to load the next image for phonegap builds.
					// The thumbnail image data is coming straight from the local file system					
					var doNext = function()
					{
						var row = items.rows.item(r);				

						if(row.photodata_tmb != "")
						{
							// Define the file name that the thumbnail should have
							var file_name = row.id + "_thumb.jpg";		
							
							// Get permission to access the file entry
							fileSystem.root.getFile(file_name, {create: true}, function(fileEntry)
							{					
								// Get access to the file object		
							    fileEntry.file(function(file)
							    {
							    	// Create a file reader and read the file data.
							    	var reader = new FileReader();

							    	// When we've finished loading the file,
							    	// build the HTML string and move to the next item
									reader.onloadend = function(evt) 
									{
				    					html += '<li><div class="deletePhoto" rel="' + row.id + '"></div><a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + evt.target.result + '" /></a><div class="imageNotes">' + row.notes + '</div></li>';
						    			num_items++;
						    			
										r++;
										
										if(r < maxLoop)				
										{
											doNext();
										}
										else
										{
											self.showPhotos(num_items, html);
										}						    														
									};
									
									reader.readAsText(file);								
							    }, fail);
								
						    	
							}, fail);
						}
						else
						{
						
							r++;
						
							if(r < maxLoop)				
							{
								doNext();
							}
							else
							{
								self.showPhotos(num_items, html);
							}
						}				
					}
					
					if(r < maxLoop)				
					{
						doNext();
					}
					else
					{
						self.showPhotos(num_items, html);
					}					
					
				}, fail);									
			}
			else
			{
				// Define the function to load the next image for non-phonegap builds
				// The thumbnail image data is coming straight from the database in this case.
				var doNext = function()
				{
					var row = items.rows.item(r);

					if(row.photodata_tmb != "")
					{
				    	html += '<li><div class="deletePhoto" rel="' + row.id + '"></div><a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + row.photodata_tmb + '" /></a><div class="imageNotes">' + row.notes + '</div></li>';
					    num_items++;
					}
					
					r++;
					
					if(r < maxLoop)				
					{
						doNext();
					}
					else
					{
						self.showPhotos(num_items, html);
					}				
				}
			}
			
			if(r < maxLoop)				
			{
				doNext();
			}
			else
			{
				self.showPhotos(num_items, html);
			}
			
		}, "");
	}
	
	this.showPhotos = function(num_items, html)
	{
		html += "</ul>";
		
		html += '<div style="clear:both;"></div>';
		
		// If matching items were found, inject them into the page, otherwise show the no history message.
		if(num_items == 0)
		{
			$("#photoWrapper #photoList").html("<p>This item has no photos.</p>");	
		}
		else
		{                
			$("#photoWrapper #photoList").html(html);
			
			// Setup touchScroll if applicable
			if(objUtils.isMobileDevice())	    
			{
				//var scroller = new TouchScroll(document.querySelector("#photoWrapper #photoList"));
			}
			
			$("#photoWrapper #photoList a").unbind();
			
			var editPhoto = function(photoID, photoData, notes)
			{
				// Setup a new image object, using the photo data as the image source
				objImage = new Image();

				objImage.src = 'data:image/jpeg;base64,' + photoData;

				//notes = "";

				// When the image has loaded, setup the image marker object
				objImage.onload = function() 
				{
 					// Resize the image so it's 600px wide  
					objResizer = new imageResizer(objImage);
					var imageData = objResizer.resize(600); 
					
					objImage = new Image();
					objImage.src = 'data:image/jpeg;base64,' + imageData;
					//notes = "";													
					
					objImage.onload = function() 
					{
 						objImageMarker = new imageMarker(objImage, "Edit Image", notes, function(imageMarkerResult)
 						{                                                      
 							// Handle the save event
 							var imageData = imageMarkerResult.imageData;
 							var notes = imageMarkerResult.notes;	
 							
 							// Create a thumbnail version of the image
							objImage = new Image();
							objImage.src = 'data:image/jpeg;base64,' + imageData;
							
							objImage.onload = function() 
							{								 													
								objResizer = new imageResizer(objImage);
								var thumbData = objResizer.resize(90);
								
								if(objApp.phonegapBuild)
								{
									// Save both the thumbnail and the full version to the local file system.
									var fail = function(error)
									{
										alert("storePhotosOnFS::Caught error: " + error.code);
									}
									
									// Request access to the file system
									window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
									{
										var file_name = photoID + "_thumb.jpg";
										
										// Get permission to write the file
										fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
										{
											// Create the file write object
											fileEntry.createWriter(function(writer)
											{
												writer.onwriteend = function(evt) 
												{
													// Get the file URI for the thumbnail image
													var uri_thumb = fileEntry.toURI();	

													// Now write the full image to the file system
													var file_name = photoID + ".jpg";
													
													fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
													{
														// Create the file write object
														fileEntry.createWriter(function(writer)
														{
															writer.onwriteend = function(evt) 
															{
																// Get the file URI for the thumbnail image
																var uri = fileEntry.toURI();
																
																// Save the image data and notes back to the database
																var sql = "UPDATE inspectionitemphotos " +
																	"SET photodata = ?, photodata_tmb = ?, notes = ?, dirty = 1 " +
																	"WHERE id = ?";
																	
																objDBUtils.execute(sql, [uri, uri_thumb, notes, photoID], function()
																{
																	self.loadPhotos();
																});																																														
															};
															
															writer.write(imageData);
															
														}, fail);
														
													}, fail); 
																		
												};
												
												// Write the thumbnail data to the file.
												writer.write(thumbData);
												
											}, fail);
												
										}, fail);
												
									}, fail); 
								}
								else
								{
									// Not phonegap build.  Just save the image data straight to the database.
									// Save the image data and notes back to the database
									var sql = "UPDATE inspectionitemphotos " +
										"SET photodata = ?, photodata_tmb = ?, notes = ?, dirty = 1 " +
										"WHERE id = ?";
										
									objDBUtils.execute(sql, [imageData, thumbData, notes, photoID], function()
									{
										self.loadPhotos();
									});	
								}									
							}
 						}, self.deleteImage, photoID, self.finalised);
 						
 						objImageMarker.show();								
					}						
				}					
			}				
			
			
			$("#photoWrapper #photoList a").bind(objApp.touchEvent, function(e)
			{					
				e.preventDefault();
				
				// Get the id of the selected photo
				var photoID = $(this).attr("rel");
				
				objDBUtils.loadRecord("inspectionitemphotos", photoID, function(photoID, row)
				{
					if(!row)
					{
						alert("Sorry, the photo record could not be loaded");
						return;
					}
					
					// If the fullsize version of the photo is not on the device, bring it down.
					if((row.photodata == null) || (row.photodata == ""))
					{
						if(confirm("The full size version of this photo is not on this device.  Would you like to download it now via the Internet?"))
						{
							var params = objApp.objSync.getLoginParams();
							if(!params)
							{
								alert("Sorry, this request could not be completed");
							}
							
							blockElement("#inspection #photoWrapper");
							
							// Create the request URL
							var url = objApp.apiURL + "inspections/get_inspection_photo/" + photoID;
							
							$.post(url, params, function(data)
							{
								unblockElement("#inspection #photoWrapper");
								
								if(data.status == "OK")
								{
									if(data.photo != "")
									{
										if(objApp.phonegapBuild)
										{
											// We have received the photo data
											// Save the photo to the file system
											var fail = function(error)
											{
												alert("storePhotosOnFS::Caught error: " + error.code);
											}
											
											window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
											{
												var file_name = photoID + ".jpg";
												
												// Get permission to write the file
												fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
												{												
													// Create the file write object
													fileEntry.createWriter(function(writer)
													{
												        writer.onwriteend = function(evt) 
												        {
												        	// Get the path to the file
												        	var uri = fileEntry.toURI();
												        	
												        	// Update the database with the path
												        	
															// We have received the photo data
															// Update the relevant record with the raw photodata.
															var sql = "UPDATE inspectionitemphotos " +
																"SET photodata = ? " +
																"WHERE id = ?";
																
															objDBUtils.execute(sql, [uri, photoID], function()
															{
																// Photo was downloaded and saved locally OK
																editPhoto(photoID, data.photo, row.notes);
															});												        	
														}
														
														// Write the photo data to the file.
														writer.write(data.photo);																											
														
													}, fail);													
													
												}, fail);
												
											}, fail);											
																							
										}
										else
										{
											// We have received the photo data
											// Update the relevant record with the raw photodata.
											var sql = "UPDATE inspectionitemphotos " +
												"SET photodata = ? " +
												"WHERE id = ?";
												
											objDBUtils.execute(sql, [data.photo, photoID], function()
											{
												// Photo was downloaded and saved locally OK
												editPhoto(photoID, data.photo, row.notes);
											});
										}
									}
								}
							}, "json");
						}
					}
					else
					{
						// Photo data already present
						if(objApp.phonegapBuild)
						{
							// Load the photo data from the file system
							objUtils.readFile(row.id + ".jpg", function(success, photoData)
							{
								if(success)
								{
									editPhoto(photoID, photoData, row.notes);	
								}
							});
						}
						else
						{
							editPhoto(photoID, row.photodata, row.notes);
						}
					}
					
				}, photoID);
			});
            $("#photoWrapper .deletePhoto").bind(objApp.touchEvent, function(e)
			{					
				e.preventDefault();
                
                if(!confirm("Are you sure you want to delete this image?  Once the issue has been deleted you cannot recover it."))
    			{
    				return false;
    			}
                
    			self.deleteImage($(this).attr('rel'));
            });									
		}	
        var itemsArr = [];
        $( ".gallery" ).sortable({
          update: function( event, ui ) {
          itemsArr = [];
            $( ".gallery > li" ).each(function(){
                var id = ($(this).find('a').attr('rel'));
                itemsArr.push(id);
            });
            var sql = 'SELECT * FROM inspectionitemphotos WHERE inspection_id = ? ORDER BY seq_no';
            objDBUtils.loadRecordsSQL(sql, [objApp.getKey("inspection_id")], function(param, items)
            {
                if(!items)
                {
                    alert("The current inspection id is NOT valid");
                    return;
                }
                else
                {
                    var maxLength = items.rows.length;
                    for (var r = 0; r < maxLength; r++)
                    {
                        var item = items.rows.item(r);
                        sql = "UPDATE inspectionitemphotos " + 
                              "SET seq_no = ? " + 
                              "WHERE id = ? ";
                        objDBUtils.execute(sql, [(r+1),itemsArr[r]], null);	
                    }
                }
            }, "");
          }
        });
        
        $( ".gallery" ).disableSelection();
        
	}
	
	/***
	* Loads all inspection items that match the passed level, area, issue and detail
	* and are older than the current inspection and shows them in a list so the user can see
	* the history for the particular defect item.
	*/
	this.loadHistory = function(level, area, issue, detail)
	{
        // Always hide the history section to start with
        if(!$(".inspectionDetails .historySection").hasClass("hidden"))
        {
            $(".inspectionDetails .historySection").addClass("hidden");
        }           
        
		// Make sure all values are present
		if((objUtils.isEmpty(level)) || (objUtils.isEmpty(area)) || (objUtils.isEmpty(issue)) || (objUtils.isEmpty(detail)))
		{
			return;
		}

        $("#historyModal #historyList").html('');
        $('#history_im_notes').html('');	
		
		// Calculate the time threshold	
		var objDate = objApp.userDateStrToDate($("#inspection #inspection_date").val());
        if(objDate == null)
        {
            return;    
        }
        
		var timeThreshold = objDate.getTime();
		
		// Calculate the MD5 hash for this defect.
		var hash = objUtils.MD5(level.toUpperCase() + area.toUpperCase() + issue.toUpperCase() + detail.toUpperCase());

		// Load the history items
		var sql = "SELECT i.inspection_date, ii.* " +
				"FROM inspectionitems ii " +
				"INNER JOIN inspections i ON ii.inspection_id = i.id AND i.deleted = 0 AND ii.inspection_id <> ? " +
				"WHERE ii.deleted = 0 " +
                "AND ii.itemtype = 0 " +
				"AND i.inspection_start < ? " +
				"AND ii.hash = ? " +
                "AND i.site_id = ? " +
				"ORDER BY i.inspection_date DESC LIMIT 5";
                
        var site_id = this.objPopSites.getValue();

		objDBUtils.loadRecordsSQL(sql, [objApp.keys.inspection_id, timeThreshold, hash, site_id], function(param, items)
		{
			if(!items)
			{
				// There were no items that match.
				$("#historyModal #historyList").html("Sorry, no history is available.");
                $("#numrepeats").val("0");	
			}
			else
			{
                $(".inspectionDetails .historySection").removeClass("hidden");
				// Loop through the items, building the output list as we go.
				var maxLoop = items.rows.length;
                $("#numrepeats").val(maxLoop);
                
				var r = 0;
				var num_items = 0;
                var max_note = 250;
				
				var html = "<ul>";

				for(r = 0; r < maxLoop; r++)
				{
				    var row = items.rows.item(r);
				    if(row.notes != "")
				    {
                        var notes = row.notes;
                        if(notes.length > max_note) {
                            notes = notes.substring(0, max_note) + "...";    
                        }
                        
				    	html += '<li><strong>' + objApp.formatUserDate(objApp.isoDateStrToDate(row.inspection_date)) + '</strong> &ndash; ' + notes 
                                + '<div id="history_'+row.id+'"></div>'
                                + '</li>';
				    }
                    else
                    {
                        html += '<li><strong>' + objApp.formatUserDate(objApp.isoDateStrToDate(row.inspection_date)) 
                                + '</strong><div id="history_'+row.id+'"></div>'
                                + '</li>';
                    }
                    num_items++;
				}
				
				html += "</ul>";
				
				// If matching items were found, inject them into the page, otherwise show the no history message.
				if(num_items == 0)
				{
					$("#historyModal #historyList").html("Sorry, no history is available.");		
				}
				else
				{
					$("#historyModal #historyList").html(html);
                    
                    var modalWidth = $("#historyModal").width();
                    $("#historyModal #historyList").css("width", "60%");                
                    
                    if (maxLoop > 1) {
                        $(".historySection #issueTimes").html(maxLoop.toString() + " times");
                    }
                    else {
                        $(".historySection #issueTimes").html("1 time");
                    }
                        
                    for(r = 0; r < maxLoop; r++)
				    {
				        var row = items.rows.item(r);
				        self.loadHistoryPhotos(row.id);
                    }
					
				    // Setup touchScroll if applicable
					if(objUtils.isMobileDevice())	    
					{
					    var scroller = new iScroll(document.querySelector("#historyModal #historyList"), { hScrollbar: false, vScrollbar: true, scrollbarClass: 'myScrollbar'});
					}									
				}
				
			}
			
			
		}, "");
	}
    // load history reinspection items
    this.loadHistoryReinspectionItems = function()
    {
        
        var sql = "SELECT ri.* " +
				"FROM reinspections ri " +
                "WHERE ri.inspection_id = ?" +
                "ORDER BY ri.reinspection_date";
        objDBUtils.loadRecordsSQL(sql, [objApp.keys.inspection_id], function(param, items)
		{
			if(!items)
			{
				// There were no items that match.
				$("#inspectionList #historyReinspection").html("Sorry, no history is available.");
                	
			}
			else
			{
				// Loop through the items, building the output list as we go.
                var maxLoop = items.rows.length;
                
				var r = 0;
                $("#inspectionList #historyReinspection").html("");
				var html = '<div style="background-color: #eee; border-radius: 5px 5px 0 0;">Choose an inspection</div>';
                    html += '<div><table style="width: 500px; height: 200px; margin: 10px 20px 20px 20px;"><tr>' +
                            '<th>Date</th>' +
                            '<th>Type</th>' +
                            '<th>Action</th>' + 
                            '</tr>';
				for(r = 0; r < maxLoop; r++)
				{
				    var row = items.rows.item(r);
                    html += '<tr rel="' + row.id + '">';
                    html += '<td>' + row.reinspection_date + '</td>';
                    html += '<td>' + row.inspection_type + '</td>';
                    html += '<td><div class="action"><a href="#" class="action passed">View</a></div></td>';
                    html += '</tr>';
				    
				}
				
				html += '</table></div>';
                $("#inspectionList #historyReinspection").html(html);
                
            }
            // bind event
             $("#historyReinspection td a.action").click(function(e)
             {
                e.preventDefault();
                var parent = $(this).parent().parent().parent();
                var id = parent.attr('rel');
                $("#historyReinspection").css("visibility", "hidden");
                self.loadReinspectionItems(id, "view");
             });
         }, "");
         
    }
    this.loadHistoryPhotos = function(inspectitem_id)
    {
        objDBUtils.orderBy = "seq_no ASC";
		var filters = [];
		filters.push(new Array("inspectionitem_id = '" + inspectitem_id + "'"));
		
		objDBUtils.loadRecords('inspectionitemphotos', filters, function(param, items)
		{
			if((!items) || (items === undefined))
			{
				$("#history_" + inspectitem_id).html("<p>There are currently no photos for this item.</p>");
			}
			
			// Loop through the items, building the output list as we go.
			var maxLoop = items.rows.length;
			var r = 0;
			var num_items = 0;   
			
			var html = '<ul class="historygallery">';
			
			if(objApp.phonegapBuild)
			{
				var fail = function(error)
				{
					alert("loadHistoryPhotos::Caught error: " + error.code);
				}
												
				// Request access to the file system
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
				{				
					// We have access to the file system.
					
					// Define the function to load the next image for phonegap builds.
					// The thumbnail image data is coming straight from the local file system					
					var doNext = function()
					{
						var row = items.rows.item(r);				

						if(row.photodata_tmb != "")
						{
							// Define the file name that the thumbnail should have
							var file_name = row.id + "_thumb.jpg";		
							
							// Get permission to access the file entry
							fileSystem.root.getFile(file_name, {create: true}, function(fileEntry)
							{					
								// Get access to the file object		
							    fileEntry.file(function(file)
							    {
							    	// Create a file reader and read the file data.
							    	var reader = new FileReader();

							    	// When we've finished loading the file,
							    	// build the HTML string and move to the next item
									reader.onloadend = function(evt) 
									{
				    					html += '<li><a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + evt.target.result + '" /></a></li>';
						    			num_items++;
						    			
										r++;
										
										if(r < maxLoop)				
										{
											doNext();
										}
										else
										{
											self.showHistoryPhotos(num_items, html, inspectitem_id);
										}						    														
									};
									
									reader.readAsText(file);								
							    }, fail);
								
						    	
							}, fail);
						}
						else
						{
						
							r++;
						
							if(r < maxLoop)				
							{
								doNext();
							}
							else
							{
								self.showHistoryPhotos(num_items, html, inspectitem_id);
							}
						}				
					}
					
					if(r < maxLoop)				
					{
						doNext();
					}
					else
					{
						self.showHistoryPhotos(num_items, html, inspectitem_id);
					}					
					
				}, fail);									
			}
			else
			{
				// Define the function to load the next image for non-phonegap builds
				// The thumbnail image data is coming straight from the database in this case.
				var doNext = function()
				{
					var row = items.rows.item(r);

					if(row.photodata_tmb != "")
					{
				    	html += '<li><a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + row.photodata_tmb + '" /></a></li>';
					    num_items++;
					}
					
					r++;
					
					if(r < maxLoop)				
					{
						doNext();
					}
					else
					{
						self.showHistoryPhotos(num_items, html, inspectitem_id);
					}				
				}
			}
			
			if(r < maxLoop)				
			{
				doNext();
			}
			else
			{
				self.showHistoryPhotos(num_items, html, inspectitem_id);
			}
			
		}, "");
    }
    
    this.showHistoryPhotos = function(num_items, html, inspectitem_id)
    {
        html += "</ul>";
		
		html += '<div style="clear:both;"></div>';
		// If matching items were found, inject them into the page, otherwise show the no history message.
		if(num_items == 0)
		{
            $("#history_" + inspectitem_id).html("<p>There are currently no photos for this item.</p>");
		}
		else
		{             
            $("#history_" + inspectitem_id).html(html);
			
			// Setup touchScroll if applicable
			if(objUtils.isMobileDevice())	    
			{
				//var scroller = new TouchScroll(document.querySelector("#photoWrapper #photoList"));
			}
			
			$("#historyList a").unbind();
            
            var loadHistoryPhoto = function(photoID, photoData, notes)
            {
                // Setup a new image object, using the photo data as the image source
				objImage = new Image();

				objImage.src = 'data:image/jpeg;base64,' + photoData;

				// When the image has loaded, setup the image marker object
				objImage.onload = function() 
				{
 					// Resize the image so it's 300px wide  
					objResizer = new imageResizer(objImage);
					var imageData = objResizer.resize(300); 
					
					objImage = new Image();
					objImage.src = 'data:image/jpeg;base64,' + imageData;												
					
					objImage.onload = function() 
					{
					    var canvasWidth = 300;
                		var canvasHeight = objImage.height;
                		
                		if(objImage.width < canvasWidth)
                		{
              			  canvasWidth = objImage.width;
                		}
                        
                        $('#history_im_Canvas').attr('height',canvasHeight);
                        $('#history_im_Canvas').attr('width',canvasWidth);
                       
					    // Setup the canvas and context
                		var canvas = document.getElementById("history_im_Canvas");
                		var context = canvas.getContext("2d");
                        
                        // Draw the image into the canvas
                        context.drawImage(objImage, 0, 0);
                        
                        $('#history_im_notes').html(notes);							
					}						
				}
            }			
			
			$("#historyList a").bind(objApp.touchEvent, function(e)
			{					
				e.preventDefault();
				
				// Get the id of the selected photo
				var photoID = $(this).attr("rel");
				
				objDBUtils.loadRecord("inspectionitemphotos", photoID, function(photoID, row)
				{
					if(!row)
					{
						alert("Sorry, the photo record could not be loaded");
						return;
					}
					
					// If the fullsize version of the photo is not on the device, bring it down.
					if((row.photodata == null) || (row.photodata == ""))
					{
						var params = objApp.objSync.getLoginParams();
						if(!params)
						{
							alert("Sorry, this request could not be completed");
						}
						
						blockElement("#inspection #photoWrapper");
						
						// Create the request URL
						var url = objApp.apiURL + "inspections/get_inspection_photo/" + photoID;
						
						$.post(url, params, function(data)
						{
							unblockElement("#inspection #photoWrapper");
							
							if(data.status == "OK")
							{
								if(data.photo != "")
								{
									if(objApp.phonegapBuild)
									{
										// We have received the photo data
										// Save the photo to the file system
										var fail = function(error)
										{
											alert("storePhotosOnFS::Caught error: " + error.code);
										}
										
										window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
										{
											var file_name = photoID + ".jpg";
											
											// Get permission to write the file
											fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
											{												
												// Create the file write object
												fileEntry.createWriter(function(writer)
												{
											        writer.onwriteend = function(evt) 
											        {
											        	// Get the path to the file
											        	var uri = fileEntry.toURI();
											        	
											        	// Update the database with the path
											        	
														// We have received the photo data
														// Update the relevant record with the raw photodata.
														var sql = "UPDATE inspectionitemphotos " +
															"SET photodata = ? " +
															"WHERE id = ?";
															
														objDBUtils.execute(sql, [uri, photoID], function()
														{
															// Photo was downloaded and saved locally OK
															loadHistoryPhoto(photoID, data.photo, row.notes);
														});												        	
													}
													
													// Write the photo data to the file.
													writer.write(data.photo);																											
													
												}, fail);													
												
											}, fail);
											
										}, fail);											
																						
									}
									else
									{
										// We have received the photo data
										// Update the relevant record with the raw photodata.
										var sql = "UPDATE inspectionitemphotos " +
											"SET photodata = ? " +
											"WHERE id = ?";
											
										objDBUtils.execute(sql, [data.photo, photoID], function()
										{
											// Photo was downloaded and saved locally OK
											loadHistoryPhoto(photoID, data.photo, row.notes);
										});
									}
								}
							}
						}, "json");
					}
					else
					{
						// Photo data already present
						if(objApp.phonegapBuild)
						{
							// Load the photo data from the file system
							objUtils.readFile(row.id + ".jpg", function(success, photoData)
							{
								if(success)
								{
									loadHistoryPhoto(photoID, photoData, row.notes);	
								}
							});
						}
						else
						{
							loadHistoryPhoto(photoID, row.photodata, row.notes);
						}
					}
					
				}, photoID);
			});									
		}
    }
	
	/***
	* saveDefect
	* The saveDefect method validates the defect form and then either creates a new
	* defect or updates an exisiting one for the current inspection.  It also updates the
	* num_defects count against the inspection record.
	*/
	this.saveDefect = function(callback)
	{
		// Make sure we have valid values for all defect pop lists
		var location =	self.objPopLocation.getText();
		var action = self.objPopAction.getText();
		var observation =  $("#frmDefectDetails #observation").val();  
		
   		if((location == "") || (location.toUpperCase() == "CHOOSE") || observation == "")
   		{
			return;
   		}
   		else
   		{
			$("#frmDefectDetails #location").val(location);	
   		}
   		
   		if((action == "") || (action.toUpperCase() == "CHOOSE"))
   		{
			return;
   		} 
   		else
   		{
			$("#frmDefectDetails #action").val(action);
   		} 
   		
   		// Set the current inspection id into the form.
   		$("#frmDefectDetails #inspection_id").val(objApp.keys.inspection_id);
   		
   		// Generate the MD5 hash of the location, action
   		var hash = objUtils.MD5(location.toUpperCase() + action.toUpperCase());
   		$("#frmDefectDetails #hash").val(hash);
   		
   		// Invoke autosave
		$("#frmDefectDetails input").blur();
		
		blockElement("#frmDefectDetails");
		
		// Invoke the autoSave method after a short delay.
		setTimeout(function()
		{
			objDBUtils.autoSave("inspectionitems", objApp.getKey("inspection_item_id"), "frmDefectDetails", function(new_id)
			{
				// If the id was not set and we just did an update, get the id
				if(objApp.getKey("inspection_item_id") == "")
				{
                    objApp.keys.inspection_item_id = new_id;
				}
				
				self.inAudit = true;
				
				if(self.restricted == 0)
				{
					// Show the delete defect button
					$("#btnDeleteDefect").css("visibility", "visible");
				}
				
				$("#photoWrapper").removeClass("hidden");
				self.loadPhotos();
				
				// self.loadHistory(level, area, issue, detail);
				
				// Update the finish time of the audit
				var objDate = new Date();
				var objTimePicker = new Timepicker();
				$("#inspection #finish").val(objTimePicker.getTimeStr(objDate));
				
				// Save the inspection
				self.checkSaveInspection();				
				
				// Get the number of defects associated with this inspection
				var sql = "SELECT COUNT(*) as num_defects " +
				    "FROM inspectionitems " +
				    "WHERE inspection_id = ? AND deleted = 0";
				    
				objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
				{
					if(row)
					{
						// Now update the parent inspection record with the defect count.
						var num_defects = row.num_defects;
						
						sql = "UPDATE inspections " +
							"SET num_defects = ? " +
							"WHERE id = ?";
							
						objDBUtils.execute(sql, [num_defects, objApp.keys.inspection_id], function()
						{
							unblockElement("#frmDefectDetails");
							
							// Show the client options modal
							setTimeout(function()
							{		    		
  								// The defect was added / saved OK. 
  								// Reload the inspection item listing
  								self.loadInspectionItems();
  								self.doingSave = false;
                                
                                //Save Observation Suggestions
                                self.addNewObservationSuggession();
                                if(callback)
                                    callback();
							}, 200);									
						});
					}
				});	

                
			});	
		}, 250);  		
	}
	
	/***
	* handleLocationChanged is fired when the user selects a level
	* from the level pop selector.
	*/
	this.handleLocationChanged = function()
	{
		self.checkAllSelected();	
	}	
	
    /***
	* handleLocationChanged is fired when the user selects a level
	* from the level pop selector.
	*/
	this.handleActionChanged = function()
	{
		self.checkAllSelected();	
	}	
	
	/***
	* Handle the event when the user has selected an issue
	*/
	this.handleIssueChanged = function()
	{
		self.checkAllSelected();	
	}
	
	/***
	* Handle the event when the user has selected a detail item
	*/	
	this.handleDetailChanged = function()
	{
		self.checkAllSelected();	
	}
	
	/***
	* Check if all required pop selectors have a valid value.  If they do,
	* create / save the defect item.
	*/	
	this.checkAllSelected = function()
	{		
		// Are there selected values for ALL pop lists?
		if((self.objPopLocation.getValue() != "")  && (self.objPopAction.getValue() != ""))
		{
			// Yes there are - create the defect item.
			self.saveDefect(); 
		}
	}
    this.checkSaveRectifiedInspectionitem = function(primaryKey)
    {
        // Invoke the autoSave method after a short delay.
        setTimeout(function()
        {
            objDBUtils.autoSave("inspectionitems", primaryKey, "frmReinspection", function()
            {
                self.doingSave = false;
                $('#reinspection .infomation').find("input").removeClass("ignore");
                setTimeout(function()
                {
                    // check database 1st
                    var priKey = "";
                    var currentdate = new Date(); 
                    var curdate = currentdate.getFullYear() + "-"
                                    + (currentdate.getMonth()+1)  + "-" 
                                    + currentdate.getDate();
                    var sql = "SELECT * FROM reinspectionitems " + 
                              "WHERE inspectionitem_id = ? AND reinspection_id = ?";
                    objDBUtils.loadRecordsSQL(sql, [primaryKey, self.reinspectionKey], function(param, items)
                    {
                        if(!items) // if it not exists, create new reinpecitonitem
                            priKey = "";
                        else // else, update that reinspectionitem
                        {
                            row = items.rows.item(0);
                            priKey = row.id;
                        }
                        objDBUtils.autoSave("reinspectionitems", priKey, "frmReinspection", function()
                        {
                            self.doingSave = false;
                            setTimeout(function()
                            { 
                                var i = 0;
                                $("#tblReinspectionListing tr").each(function(){
                                    //update another items
                                    var ii_id = $(this).attr("rel");
                                    var rect = $(this).find("td:eq(4)").text();
                                    if (ii_id != primaryKey)
                                    {
                                        sql = "SELECT rii.inspectionitem_id, rii.rectified, ri.reinspection_date " + 
                                              "FROM reinspectionitems rii " +
                                              "INNER JOIN reinspections ri ON ri.id = rii.reinspection_id " +
                                              "INNER JOIN inspectionitems ii ON ii.id = rii.inspectionitem_id " +
                                              "WHERE ri.id = ? AND ii.id = ? " +
                                              "GROUP BY ri.reinspection_date LIMIT 1";
                                        objDBUtils.loadRecordsSQL(sql, [self.reinspectionKey, ii_id], function(param, items)
                                        {
                                            if (!items)
                                            {
                                                sql = "INSERT INTO reinspectionitems(id, reinspection_id, inspectionitem_id, rectified) " + 
                                                      "VALUES(?,?,?,?)";
                                                var primKey = objDBUtils.makeInsertKey(objApp.sync_prefix) + i;
                                                var values = [primKey, self.reinspectionKey, ii_id, rect];
                                                objDBUtils.execute(sql, values, function(){
                                                    console.log("Insert reinspectionitems success");
                                                });
                                            }
                                            else
                                            {
                                                var row = items.rows.item(0);
                                                if (row.reinspection_date != curdate)
                                                {
                                                    sql = "INSERT INTO reinspectionitems(id, reinspection_id ,inspectionitem_id, rectified) VALUES(?,?,?,?)";
                                                    var values = new Array();
                                                    var primKey = objDBUtils.makeInsertKey(objApp.sync_prefix) + i;
                                                    values.push(primKey, self.reinspectionKey, row.inspectionitem_id, row.rectified);
                                                    objDBUtils.execute(sql, values, function(){
                                                        console.log("Insert reinspectionitems success");
                                                    });
                                                }
                                            }
                                            i++;
                                        }, "");
                                        
                                    }
                                });
                                
                                $('#reinspection .infomation').find("input").addClass("ignore");
                            }, 250);             
                        });	
                    }, "");
                    
                    
                }, 250);  
                  
            });	
        }, 250);  
    }

    this.checkSaveRateInspection = function()
    {
        // Invoke the autoSave method after a short delay.
	    setTimeout(function()
	    {
			objDBUtils.autoSave("inspections", objApp.keys.inspection_id, "frmRateDetails", function()
			{
			    // If the id was not set and we just did an update, get the id
			    if(objApp.keys.inspection_id == "")
			    {
			        objDBUtils.setKeyFromLastInsertID("inspection_id");
			    }
                
                // If we have an active inspection then show the coversheet notes button
                if(self.finalised == 0) {
                    $("a.btnEditNotes").show();
                    $("a.btnEditClientNotes").show();
                    $("a.btnEditPrivateNotes").show();
                } else {
                    $("a.btnEditNotes").hide();
                    $("a.btnEditClientNotes").hide();
                    $("a.btnEditPrivateNotes").hide();
                }
			    
			    self.setReturnInspectionID(objApp.keys.inspection_id);
			    
			    // unblockElement(".inspectionDetails");
			    
			    // Show the toggle objects
			    $("#toggles").removeClass("hidden");
			    
			    // self.checkCanDelete();
                
                self.doingSave = true;
			    
			    // Show the client options modal
			    			
			});	
	    }, 250);
    }
	this.checkSaveReinspection = function(inspection_id, reinspection_date,failed)
    {
        var sql = "SELECT * FROM reinspections WHERE inspection_id = ? AND reinspection_date = ? AND inspection_type = 'Reinspection'";
        var values = [];
        objDBUtils.loadRecordsSQL(sql, [inspection_id, reinspection_date], function(param, items){
            if(!items)
            {
                var primaryKey = objDBUtils.makeInsertKey(objApp.sync_prefix);
                sql = "INSERT INTO " + 
                      "reinspections(id, inspection_id, reinspection_date, failed, inspection_type) " + 
                      "VALUES(?,?,?,?,?)";
                values = [primaryKey, inspection_id, reinspection_date, failed, "Reinspection"];
                objDBUtils.execute(sql, values, function(){
                    console.log("Insert reinspection success");
                    self.reinspectionKey = primaryKey;
                });
            }
            else
            {
                self.reinspectionKey = items.rows.item(0).id;
            }
        }, "");
    }
    
    this.checkUpdateInspection = function()
    {
        // Invoke the autoSave method after a short delay.
        $("#reinspection input#failed").removeClass("ignore");
        // $("#reinspection input#finalised").removeClass("ignore");
        $("#reinspection select#rectified").addClass("ignore");
	    setTimeout(function()
	    {
			objDBUtils.autoSave("inspections", objApp.keys.inspection_id, "frmReinspection", function()
			{
			    // If the id was not set and we just did an update, get the id
			    if(objApp.keys.inspection_id == "")
			    {
			        objDBUtils.setKeyFromLastInsertID("inspection_id");
			        // objDBUtils.setKeyFromLastInsertID("report_type");
			    }
                
                // If we have an active inspection then show the coversheet notes button
                if(self.finalised == 0) {
                    $("a.btnEditNotes").show();
                    $("a.btnEditClientNotes").show();
                    $("a.btnEditPrivateNotes").show();
                } else {
                    $("a.btnEditNotes").hide();
                    $("a.btnEditClientNotes").hide();
                    $("a.btnEditPrivateNotes").hide();
                }
			    
			    self.setReturnInspectionID(objApp.keys.inspection_id);
                $('#btnCapturePhoto').attr('data-reveal-id', 'photoWrapper');
			    
			    // unblockElement(".inspectionDetails");
                $("#reinspection input#failed").addClass("ignore");
                $("#reinspection input#finalised").addClass("ignore");
                $("#reinspection select#rectified").removeClass("ignore");
                self.doingSave = false;
			    
			    // Show the client options modal
			    			
			});	
	    }, 250);
    }
    
    
	/***
	* checkSaveInspection
	* The checkSaveInspection method is invoked when the user changes something on the inspection
	* details form.  It checks if enough information has been provided and if so, adds/updates the
	* inspection.
	*/	
	this.checkSaveInspection = function()
	{
	    // Validate the form
	    if(!$("#frmInspectionDetails").validate().form())
	    {
	        return;
	    }
	    
	    // Make sure both the client and site pop selectors are also set
	    if((self.objPopBuilders.getValue() == ""))
	    {
			return;
	    }
        
        if(self.doingSave) {
            return false;    
        }
        
        self.doingSave = true;

	    // Determine if this is a new inspection or not.
	    var newInspection = true;
	    
	    if(objApp.keys.inspection_id != "")
	    {
	    	// There is already an inspection_id defined.
	    	// This is not a new inspection.
			newInspection = false;
	    }
	    
	    // Set the duration and inspection start hidden vars
		var start = $("#frmInspectionDetails #start").val();
		var finish = $("#frmInspectionDetails #finish").val();
		
		// Calculate inspection duration
		var duration = objTimePicker.timeToSeconds(finish) - objTimePicker.timeToSeconds(start);
		
		// Check for a negative time which means we're spanning midnight
        if (duration < 0)
        {
            // We're spanning midnight
            var bm; 	// Before midnight
            var am;	    // After midnight

            // Find out how much time was before midnight,
            // and how much after.  (There are 86400 secs in a day)
            bm = 86400 - objTimePicker.timeToSeconds(start);
            am = objTimePicker.timeToSeconds(finish);

            // Add them together to get total visit time
            duration = bm + am;
        }		
		
		// Convert the visit duration from seconds to an expression of hours
		if(duration <= 0) 
		{
			duration = 0; 
		}
		else
		{
			// Get duration into minutes
			duration = Math.floor(duration / 60);			    
		}
		
		$("#frmInspectionDetails #duration").val(duration);

		// Get the inspection date as a date object
		var inspection_date = $("#frmInspectionDetails #inspection_date").val(); 
        
        // If the inspection date is NOT in ISO format we need to convert it
        if((inspection_date.length != 10) || (inspection_date.substring(4, 5) != "-")) 
        {
		    var objDate = objApp.userDateStrToDate(inspection_date);	
		    
		    // Get the date as a timestamp.
		    var inspection_start = objDate.getTime();
		    
		    // Set the timestamp into the hidden form var so it's saved later.
		    $("#frmInspectionDetails #inspection_start").val(inspection_start);
		    
		    // Convert AU date format date back to ISO before saving
		    var result = objDate.getFullYear() + "-";
		    if((objDate.getMonth() + 1) < 10) result += "0";
		    result += (objDate.getMonth() + 1) + "-";
		    if(objDate.getDate() < 10) result += "0";
		    result += objDate.getDate();
		    
		    // Save the visit_date back to the form
		    $("#frmInspectionDetails #inspection_date").val(result);		
        }
	    
	    // Ready to save
	    $("#frmInspectionDetails input").blur();
	    
	    blockElement(".inspectionDetails");
	    
	    // Invoke the autoSave method after a short delay.
	    setTimeout(function()
	    {
			objDBUtils.autoSave("inspections", objApp.keys.inspection_id, "frmInspectionDetails", function()
			{
			    // If the id was not set and we just did an update, get the id
			    if(objApp.keys.inspection_id == "")
			    {
			        objDBUtils.setKeyFromLastInsertID("inspection_id");
			        // objDBUtils.setKeyFromLastInsertID("report_type");
			    }
                
                // If we have an active inspection then show the coversheet notes button
                if(self.finalised == 0) {
                    $("a.btnEditNotes").show();
                    $("a.btnEditClientNotes").show();
                    $("a.btnEditPrivateNotes").show();
                } else {
                    $("a.btnEditNotes").hide();
                    $("a.btnEditClientNotes").hide();
                    $("a.btnEditPrivateNotes").hide();
                }
			    
			    self.setReturnInspectionID(objApp.keys.inspection_id);
                $('#btnCapturePhoto').attr('data-reveal-id', 'photoWrapper');
			    
			    unblockElement(".inspectionDetails");
			    
			    // Show the toggle objects
			    $("#toggles").removeClass("hidden");
			    
			    self.checkCanDelete();
                
                self.doingSave = false;
			    
			    // Show the client options modal
			    			
			});	
	    }, 250);
	}
    
    /***
    * Sets the listing table column widths (headers and cells)
    * as required.
    */
    this.setTableWidths2 = function(tblHeader, tblBody, column, width)
    {                
        // Setup table column widths
        var orientation = objApp.getOrientation();
        if(width === undefined)
        {
            var screenWidth = screen.width;
        }
        else
        {
            var screenWidth = width;
        }
        
        if(orientation == "landscape") {
            screenWidth = screen.height;
        }
        
        var tableWidth = screenWidth - 50;
        var tableHeader = $("#" + tblHeader);
        var tableBody = $("#" + tblBody);

        $(tableHeader).css("width", tableWidth + "px");
        $(tableBody).css("width", tableWidth + "px");
        
        $(tableHeader).css("table-layout", "fixed");
        $(tableBody).css("table-layout", "fixed");
        var normal_col_width = Math.floor(tableWidth / column);
        // var last_col_width = tableWidth - (column - 1) * normal_col_width;
        for(var i = 0; i < column; i++)
        {
            if((tblHeader === "tblReinspectionHeader") && (tblBody === "tblReinspectionListing"))
            {
                $(tableHeader).find("th:eq("+i+")").css("width", 25 + "%"); 
                $(tableBody).find("tr td:eq("+i+")").css("width", 25 + "%");  

            }
            else
            {
                if((tblHeader != "tblRateListingHeader") && (tblBody != "tblRateListing"))
                {
                    if(i == 0)
                    {
                        $(tableHeader).find("th:eq("+i+")").css("width", 30 + "px"); 
                        $(tableBody).find("tr td:eq("+i+")").css("width", 30 + "px");  
                    }
                }
                else
                {
                    $(tableHeader).find("th:eq("+i+")").css("width", normal_col_width + "px"); 
                    $(tableBody).find("tr td:eq("+i+")").css("width", normal_col_width + "px");  
                }
            }
        }
    }    
	
	/* **
	* loadInspectionItems loads the inspection items that belong to this inspection 
	* and shows them in the items table
	 */
	this.loadInspectionItems = function()
	{
		// Ensure a valid inspection id is set
		if(objApp.keys.inspection_id == "")
		{
			return;
		}
		
		var listDeleteMode = true;
		// if(self.finalised == 1)
		// {
			// listDeleteMode = false;
		// }
        
        // Remove the triangle from the table header cells
		$("#tblDefectListingHeader th .triangle").remove();
		// Inject the triangle
		$("#tblDefectListingHeader th[class='" + self.itemSortBy + "']").append('<span class="triangle ' + self.itemSortDir + '"></span>');
		
		// Unbind any more button events
		$("#defectScrollWrapper").unbind();
		$("#tblDefectListing td").unbind();
		
		// Load the inspection items records
		objDBUtils.orderBy = self.itemSortBy + " " + self.itemSortDir; //"seq_no DESC";
		
		var filters = [];
		filters.push(new Array("inspection_id = '" + objApp.keys.inspection_id + "'"));
        
        var keyword = $('#keywords').val();
        if (keyword != '')
        {
            filter_string = "(location LIKE '%"+keyword+"%' OR observation LIKE '%"+keyword+"%' OR action LIKE '%"+keyword+"%' OR notes LIKE '%"+keyword+"%')";
            filters.push(new Array(filter_string));
        }
		blockElement(".inspectionDetails");
		objDBUtils.loadRecords("inspectionitems", filters, function(param, items)
		{
		    unblockElement(".inspectionDetails");
			$("#defectScrollWrapper").html(""); 
			
			if(!items)
			{
				// Handle no items
			}				
			else
			{
				// Loop through the items and put them into the table.
				var html = '<table id="tblDefectListing" class="listing">';
				
				var maxLoop = items.rows.length;
                
                self.numberOfIssues = 0;
                self.numberOfAcknowledgements = 0;
                
				var r = 0;
				
			    for(r = 0; r < maxLoop; r++)
			    {
			        var row = items.rows.item(r);
			        html += '<tr rel="' + row.id + '">';
                    html += '<td class="delete"></td>';
			        html += '<td><span class="seq_no">' + row.seq_no + '</span>';
                    if (maxLoop > 1)
                    {
                        if (r == 0)
                            html += '<span class="arrow down"></span></td>';
                        else if (r == maxLoop - 1)
                            html += '<span class="arrow up"></span></td>';
                        else
                            html += '<span class="arrow up"></span><span class="arrow down"></span></td>';
			        }
                    html += '<td>' + row.location + '</td>';
			        html += '<td>' + row.observation + '</td>';
			        html += '<td>' + row.action + '</td>';
			        html += '</tr>';
                    
                    if(row.itemtype == 0) {
                        self.numberOfIssues++;        
                    } else {
                        self.numberOfAcknowledgements++;    
                    }
				}
				
				html += '</table>';
				
				$("#defectScrollWrapper").html(html);
                
                // self.setTableWidths2('tblDefectListingHeader', 'tblDefectListing', 5);
				
				// if(listDeleteMode)
				// {
				/* 	// Check if the delete column has been added
					if($("#tblDefectListingHeader th.delete").length == 0)
					{
						// Add the delete header cell in
						$("#tblDefectListingHeader th:eq(0)").before('<th class="delete"></th>');	
					}					
						
					// Loop through the listing table rows and
					// add the delete cell into all the listing rows
					$("#tblDefectListing tr").each(function()
					{
						// Do the same for the listing table
						currentWidth = parseInt($(this).find("td:eq(0)").css("width"));
						$(this).find("td:eq(0)").css("width", currentWidth - 15 + "px");
						
						currentWidth = parseInt($(this).find("td:eq(1)").css("width"));
						$(this).find("td:eq(1)").css("width", currentWidth - 15 + "px");														
						
						$(this).find("td:eq(0)").before('<td class="delete"></td>');
					}); */
					self.setTableWidths2('tblDefectListingHeader', 'tblDefectListing', 5);
					// Make the header table cell widths exactly the same as the first row of the data table.
					/* var idx = 0;
					$("#tblDefectListing tr:eq(0) td").each(function()
					{
						$("#tblDefectListingHeader th:eq(" + idx + ")").css("width", $(this).css("width"));
						idx++;
					}); */
				// }
				/* else
				{
					// Check if the delete column has been added
					if($("#tblDefectListingHeader th.delete").length == 1)
					{
						// Add the delete header cell in
						$("#tblDefectListingHeader th:eq(0)").remove();
						
						// Make the header table cell widths exactly the same as the first row of the data table.
						var idx = 0;
						$("#tblDefectListing tr:eq(0) td").each(function()
						{
							$("#tblDefectListingHeader th:eq(" + idx + ")").css("width", $(this).css("width"));
							idx++;
						});						
					}					
				} */
				if(objUtils.isMobileDevice())	    
			    {
                    self.scroller = new iScroll(document.querySelector("#defectScrollWrapper"), { hScrollbar: false, vScrollbar: true, scrollbarClass: 'myScrollbarSm'});
				}
				// Bind the more button events
                $("#tblDefectListing span.arrow").bind("click", function(e)
                    {
                        
                        self.is_change_order = true;
                        var is_up = $(this).hasClass("up");
                        // Update database
                        var inspection_current = $(this).parent().parent();
                        var inspection_next = inspection_current.next();
                        var inspection_prev = inspection_current.prev();
                        var seq_no_current;
                        var seq_no_swap = "";
                        var id_swap = "";
                        var id_curr = inspection_current.attr("rel");
                        if (is_up)
                        {
                            seq_no_swap = inspection_prev.children(":nth-child(2)").children(":nth-child(1)").text();
                            id_swap = inspection_prev.attr("rel");
                            seq_no_current = $(this).prev().text();
                        }
                        else
                        {
                            seq_no_swap = inspection_next.children(":nth-child(2)").children(":nth-child(1)").text();
                            id_swap = inspection_next.attr("rel");
                            var is_1st = inspection_current.is(":first-child");
                            if (is_1st)
                                seq_no_current = $(this).prev().text();
                            else
                                seq_no_current = $(this).prev().prev().text();
                            
                        }
                        var sql = "UPDATE inspectionitems " +
                            "SET seq_no = ? " +
                            "WHERE id = ?";
                        objDBUtils.execute(sql, [seq_no_swap,id_curr], null);
                        objDBUtils.execute(sql, [seq_no_current,id_swap], null);
                        
                        
                        //Reload table
                        self.loadInspectionItems();
                        
                        e.preventDefault();
                    });
                
                
				$("#tblDefectListing td").bind("click", function(e)
				{
                    
                    if(self.is_change_order)
                    {
                        is_change_order = false;
                        return;
                    }
                    
					e.preventDefault();
		
					var inspection_item_id = $(this).parent().attr("rel");
					
					var parent = $(this).parent();
					var table = $(parent).parent();

				    // Remove any active states of the list items
				    $(table).find("tr").removeClass("active");
				    
				    // Set the active state
				    $(parent).addClass("active");					

				    if(listDeleteMode)
				    {
						// Did the user click on the first column
						var idx = $(this).index();
						
						if(idx == 0)
						{
							// Setup delete 
							// Get the item name
							var item_name = $(parent).find("td:eq(1)").text();
							item_name += ", " + $(parent).find("td:eq(2)").text();
							item_name += ", " + $(parent).find("td:eq(3)").text();
							
							if(confirm("Delete '" + item_name + "', are you sure?"))
							{
								self.deleteDefect(inspection_item_id);
								return;
							}
						}
                        
                        if(confirm("Would you like to edit this item?"))
    					{
    						blockElement("#tblDefectListing");
    					
        					// Load the inspection item record
        					objDBUtils.loadRecord("inspectionitems", inspection_item_id, function(inspection_item_id, item)
        					{
        						unblockElement("#tblDefectListing");
        						
        						if(!item)
        						{
        							return;
        						}
        						
        						objApp.keys.inspection_item_id = item.id;
        						objApp.keys.level = item.level;
        						objApp.keys.area = item.area;
        						objApp.keys.issue = item.issue;
        						objApp.keys.detail = item.detail;
        						
        						self.showStep2(item);
        								
        					}, inspection_item_id);
    					}
				    }
					return false;
				});
                
			}
		}, ""); 
	}
	this.loadReinspectionItems = function(reinspection_id, action)
	{
        objApp.clearMain();
        // Set the main heading
        objApp.setHeading("Blueprint Inspections");
        objApp.setSubHeading("Reinspection");
        objApp.setNavActive("#navReinspect");
        objApp.setSubExtraHeading("", true);
        $("#reinspection").removeClass("hidden");
		// Ensure a valid inspection id is set
        if(reinspection_id)
            self.reinspectionKey = reinspection_id;
		if(objApp.keys.inspection_id == "")
		{
			return;
		}
		blockElement(".inspectionDetails");
        var sql = "";
        if (action == "view")
        {
            sql += "SELECT ii.seq_no, ii.location, ii.action, ii.observation, ri.rectified, ii.id, r.failed " +
			"FROM inspectionitems ii " +
            "INNER JOIN reinspectionitems ri ON ri.inspectionitem_id = ii.id " +
            "INNER JOIN reinspections r ON r.id = ri.reinspection_id " +
            "WHERE ii.deleted = 0 ";
            $(".inspectionDetails .failed").removeClass('active');
            $(".inspectionDetails .passed").removeClass('active');
            $(".inspectionDetails .finished").removeClass('active');
            $(".inspectionDetails .passed").addClass('active');
        }
        else
        {
            sql += "SELECT ii.* " +
			"FROM inspectionitems ii " +
            "WHERE ii.deleted = 0 ";
        }
            
        var values = new Array();
        sql += "AND ii.inspection_id = ? ";
        values.push(objApp.keys.inspection_id);
        if (reinspection_id != "")
        {
            sql += "AND ri.reinspection_id = ? ";
            values.push(reinspection_id);
        }
        sql += "GROUP BY ii.seq_no ";
        sql += "ORDER BY ii.seq_no ASC ";
        
		objDBUtils.loadRecordsSQL(sql, values, function(param, items)
		{
		    unblockElement(".inspectionDetails");
			$("#reinspectionScrollWrapper").html("");
			if(!items)
            {
                objApp.showHideSpinner(false, "#reinspection");
				return;	 
            }			
			else
			{
				// Loop through the items and put them into the table.
				var html = '<table id="tblReinspectionListing" class="listing">';
				
				var maxLoop = items.rows.length;
                
                // self.numberOfIssues = 0;
                // self.numberOfAcknowledgements = 0;
                
				var r = 0;
			    for(r = 0; r < maxLoop; r++)
			    {
			        var row = items.rows.item(r);
			        html += '<tr rel="' + row.id + '">';
			        html += '<td>' + row.seq_no + '</td>';
                    html += '<td>' + row.location + '</td>';
			        html += '<td>' + row.observation + '</td>';
			        html += '<td>' + row.action + '</td>';
			        html += '<td>' + row.rectified + '</td>';
			        html += '</tr>';
                    
                    // if(row.itemtype == 0) {
                        // self.numberOfIssues++;        
                    // } else {
                        // self.numberOfAcknowledgements++;    
                    // }
				}
				
				html += '</table>';
				
				$("#reinspectionScrollWrapper").html(html);
                
                self.setTableWidths2('tblReinspectionHeader', 'tblReinspectionListing', 5);
				self.handleFinalised();
				
				if(objUtils.isMobileDevice())	    
			    {
                    self.scroller = new iScroll(document.querySelector("#reinspectionScrollWrapper"), { hScrollbar: false, vScrollbar: true, scrollbarClass: 'myScrollbarSm'});
				}				 
				
				
				
				// Bind the more button events
                $('#tblReinspectionListing tr').bind("click", function() {
                
                    self.cur_sel_ins_item = $(this);
                
                    var text = $(this).find("td:eq(0)").text() + ". ";
                    text += $(this).find("td:eq(1)").text() + ", ";
                    text += $(this).find("td:eq(2)").text();
                    var val_rec = $(this).find("td:eq(4)").text();
                    $('#reinspection select#rectified').val(val_rec);
                    $('#reinspection .infomation p').html(text);
                    $('#reinspection .infomation input#inspectionitem_id').val($(this).attr("rel"));
                    $('#reinspection .infomation input#reinspection_id').val(self.reinspectionKey);
                    $('#reinspection .infomation select#rectified').show();
                });
                $('#reinspection select#rectified').bind("change", function() {
                    var text = $(this).val();
                    self.cur_sel_ins_item.children("td:nth-child(5)").text(text);
                    self.checkSaveRectifiedInspectionitem(self.cur_sel_ins_item.attr("rel"));
                    
                });
                $("#reinspection a.passed").bind("click", function(){
                    self.updateReinspectionItems(0);
                });
                $("#reinspection a.failed").bind("click", function(){
                    self.updateReinspectionItems(1);
                });
                
			}
		}, "");
            self.finalised = 0;
	}
	this.updateReinspectionItems = function(failed)
    {
        var sql = "UPDATE reinspections SET failed = ? WHERE id = ?";
        objDBUtils.execute(sql, [failed, self.reinspectionKey], function(){
            console.log("Update reinspection success");
        });
    }
	this.addNewBase = function(resource_type, resource_type_name, objSelector, parent_id)
	{
		// get the value the user has entered for the new item
		var new_value = $("#popSelector #popSelectorSearch").val();
		
		// if there is no value, do nothing
		if(new_value == "")
		{
			alert("Please enter the name of the item that you would like to add in the text box");
			$("#popSelector #popSelectorSearch").focus();
			return;
		}
		
		if(!confirm("Add a new " + resource_type_name + " called '" + new_value + "'.  Are you sure?"))
		{
			return;
		}
		
		var values = [resource_type, new_value];
		
		// Make sure this value doesn't already exist
		var sql = "SELECT * " +
			"FROM resources " +
			"WHERE resource_type = ? " +
			"AND name = ? " +
			"AND deleted = 0";
			
		if(parent_id != "")
		{
			sql += " AND parent_id = ?"
			values.push(parent_id);
		}
		
			
		objDBUtils.loadRecordSQL(sql, values, function(resource)
		{
			if(resource)
			{
				alert("Sorry, a " + resource_type_name + " already exists with this name");
				return;
			}
			
			sql = "INSERT INTO resources(id, resource_type, name, created_by, parent_id) " +
				"VALUES(?, ?, ?, ?, ?)";
				
			// Create a new insert key
			var new_id = objDBUtils.makeInsertKey(objApp.sync_prefix);
			
			// Get the logged in users id
			var user_id = localStorage.getItem("user_id");
			
			values = [new_id, resource_type, new_value, user_id];
			
			if(parent_id == "")
			{
				values.push(null);
			}
			else
			{
				values.push(parent_id);
			}
			
			objDBUtils.execute(sql, values, function()
			{
                if(objSelector != null)
                {
                    // Add the new item to the popselector
                    objSelector.addOption(new_id, new_value);
                    
                    objSelector.sortAndRefresh();
                    
                    // Select the new element and close the pop selector
                    objSelector.selectElementAndClose(new_id, new_value);
                }
            });
		});		
	}
    
    this.addNewLocation = function()
	{
    	self.addNewBase(1, "location", self.objPopLocation, ""); 
	}
	
	this.addNewAction = function()
	{
		self.addNewBase(2, "action", self.objPopAction, "");
	}
    
    this.addNewObservationSuggession = function()
	{
		// get the value the user has entered for the new item
		var new_value = $("#observation").val();
		
		// if there is no value, do nothing
		if(new_value == "")
		{
			console.log("Please enter the name of the item that you would like to add in the text box");
			return;
		}
        
        var resource_type = 3;
		
		var values = [resource_type, new_value];
		
		// Make sure this value doesn't already exist
		var sql = "SELECT * " +
			"FROM resources " +
			"WHERE resource_type = ? " +
			"AND name = ? " +
			"AND deleted = 0";
		
			
		objDBUtils.loadRecordSQL(sql, values, function(resource)
		{
			if(resource)
			{
				console.log("Sorry, a observation suggession already exists with this name");
				return;
			}
			
			sql = "INSERT INTO resources(id, resource_type, name, created_by, parent_id) " +
				"VALUES(?, ?, ?, ?, ?)";
				
			// Create a new insert key
			var new_id = objDBUtils.makeInsertKey(objApp.sync_prefix);
			
			// Get the logged in users id
			var user_id = localStorage.getItem("user_id");
			
			values = [new_id, resource_type, new_value, user_id, null];
			objDBUtils.execute(sql, values, function()
			{
                console.log("Save a new observation suggession");
            
                var filters = [];
                filters.push(new Array("resource_type = 3"));
                objDBUtils.orderBy = "";
                
                $("#frmDefectDetails #observation_suggestion").empty();
            });
		});	
	}
	
	/***
	* Checks to see if the current inspectio can be deleted or not
	* If the inspection has not yet been saved, or has not yet been finalised it cannot be deleted.
	* Inspections that have been finalised but have no items can also be deleted.
	*/
	this.checkCanDelete = function()
	{
		var showButton = false;
		
		if(objApp.keys.inspection_id == "")
		{
			// No inspection id means we can't delete the inspection.
			$("#inspection #btnDeleteInspection").addClass("hidden"); 
			return;	
		}   
		
		// Load the inspection record
		objDBUtils.loadRecord("inspections", objApp.keys.inspection_id, function(param, inspection)
		{
			if(inspection.finalised)
			{
				// A finalised inspection may only be deleted if it has no items
				var sql = "SELECT COUNT(*) as num_items " +
					"FROM inspectionitems " +
					"WHERE inspection_id = ? " +
					"AND deleted = 0";
					
				objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
				{
					if(!row) return;
					
					if(row.num_items == 0)
					{
						// This inspection has no items.  Allow the inspection to be deleted
						$("#inspection #btnDeleteInspection").removeClass("hidden");	
					}
					else
					{
						// This inspection has items.  It may not be deleted.
						if(!$("#inspection #btnDeleteInspection").hasClass("hidden"))
						{
							$("#inspection #btnDeleteInspection").addClass("hidden");
						}						
					}
					
				});
			}
			else
			{
				$("#inspection #btnDeleteInspection").removeClass("hidden"); 		
			}
		}, "");		
	}
    
    this.handleFinalised = function()
    {      
        if (self.finalised == 1)
        {
            // Hide the buttons for notes and adding more issues.
            $('.reportNotes').addClass('hidden');
            $("a.btnEditNotes").hide();
            $("a.btnEditClientNotes").hide();
            $("a.btnEditPrivateNotes").hide();            
            $(".inspectionDetails .finished").addClass('active');
            $('#btnStep3AddAnotherIssue').addClass('hidden');
            $('#btnStep3Back').addClass('hidden');
            $('#finished').addClass('active');
            $('#keywords').addClass('hidden');
            
            // Show the next button
            $('#btnStep3Next').removeClass('hidden');
        }
        else
        {
            // Hide the next button
            // $('#btnStep3Next').addClass('hidden'); 
            
            // Show the notes and add anoter issue button
            $('.reportNotes').removeClass('hidden');
            $("a.btnEditNotes").show();
            $("a.btnEditClientNotes").show();
            $("a.btnEditPrivateNotes").show();            
            $(".inspectionDetails .finished").removeClass('active');
            $('#btnStep3AddAnotherIssue').removeClass('hidden');
            $('#btnStep3Back').removeClass('hidden');
            $('#finished').removeClass('active');
            $('#keywords').removeClass('hidden');
        }   
        
        this.setReadOnly();     
    }    
	
	/***
	* Sets the UI controls into read only mode if the inspection has been finalised.
	*/
	this.setReadOnly = function()
	{
        if(self.objPopBuilders == null) {
            return;    
        }		
        
        if(self.finalised == 1)
		{            
            self.objPopBuilders.readOnly = true;
			self.objToggleFailed.preventToggle = true;
			
			if(self.objPopLocation != null ) self.objPopLocation.readOnly = true;
			if(self.objPopAction != null ) self.objPopAction.readOnly = true;
			
			$("#addPhotoContainer").css("visibility", "hidden");
			//$("#btnSaveDefect").css("visibility", "hidden");
			$("#btnDeleteDefect").css("visibility", "hidden");
			$("#btnAddDefect").css("visibility", "hidden");
            $("#btnAddDefect").css("display", "none");
			
			// When the inspection has been finalised, show the print button.
			$("#print").css("visibility", "visible");
		}
		else
		{
			self.objPopBuilders.readOnly = false;
			self.objToggleFailed.preventToggle = false;
			
			if(self.objPopLocation != null ) self.objPopLocation.readOnly = false;
			if(self.objPopAction != null ) self.objPopAction.readOnly = false;
			
			$("#addPhotoContainer").css("visibility", "visible");
			//$("#btnSaveDefect").css("visibility", "visible");
			$("#btnAddDefect").css("visibility", "visible");
            $("#btnAddDefect").css("display", "");
            $("#print").css("visibility", "hidden");
			
			if(objApp.getKey("inspection_item_id") != "")
			{
				$("#btnDeleteDefect").css("visibility", "visible");
			}					
		}
	}
	
	/***
	* The showPrintModal method is called when the user taps on the print icon
	*/
	this.showPrintModal = function()
	{
		$("#printModal").show();
		
		// Setup toggles
		$("#printModalClose").unbind();
		$("#sendToToggles a").unbind();
		$("#downloadReport").unbind();
		$("#sendReport").unbind();
		
		$("#sendToToggles").html("");
		
		var userEmail = localStorage.getItem("email");
		var clientEmail = "";
		var clientContactEmail = "";
		var siteContactEmail = "";
		
		// Load the client email address details
		var sql = "SELECT c.*, s.address1 as site_address1, s.address2 as site_address2, s.external_email as site_external_email " +
			"FROM clients c " + 
			"INNER JOIN inspections i ON c.id = i.client_id " +
			"INNER JOIN sites s ON i.site_id = s.id " +
			"WHERE i.id = ?";
			
		objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(client)
		{
			if(!client)
			{
				alert("Sorry, the client record could not be loaded.");
				return;
			}
			
			clientEmail = client.email;
			clientContactEmail = client.external_email;
			siteContactEmail = client.site_external_email;
			
			var addressStr = client.site_address1;
			if((addressStr != "") && (client.site_address2 != ""))
			{
				addressStr += ", " + client.site_address2;
			}
			
			$("#printModal #emailSubject").val("Planet Earth Inspection Report");
			$("#printModal #emailMessage").val("Please find attached an inspection report for " + client.name + " at " + addressStr + ".");
		});
		
		var refreshSendTo = function()
		{
			var csv = "";
			
			if($("#printModal #sendToMe").val() == 1)
			{
				csv += userEmail;	
			}
			
			if($("#printModal #sendToClient").val() == 1)
			{
				if(clientEmail != "")
				{
					if(csv != "") csv += ",";
					csv += clientEmail;	
				}
			}
			
			if($("#printModal #sendToExternalRef").val() == 1)
			{
				if(clientContactEmail != "")
				{
					if(csv != "") csv += ",";
					csv += clientContactEmail;	
				}
			}
			
			if($("#printModal #sendToExternalRef2").val() == 1)
			{
				if(siteContactEmail != "")
				{
					if(csv != "") csv += ",";
					csv += siteContactEmail;	
				}
			}			
			
			$("#printModal #emailTo").val(csv);
		};
		
		// Setup toggle controls
  		var objToggleSendToMe = new toggleControl("toggleSendToMe", "#printModal #sendToMe", "binary", "Me", function()
  		{
			refreshSendTo();		
  		}); 
  		 		
  		var objToggleSendToClient = new toggleControl("toggleSendToClient", "#printModal #sendToClient", "binary", "Client", function()
  		{
			refreshSendTo();	
  		}); 
  		
  		var objToggleSendToExternal = new toggleControl("toggleSendToExternal", "#printModal #sendToExternalRef", "binary", "Main Contact", function()
  		{
			refreshSendTo();	
  		});  
  		
  		var objToggleSendToExternal2 = new toggleControl("toggleSendToExternal2", "#printModal #sendToExternalRef2", "binary", "Site Contact", function()
  		{
			refreshSendTo();	
  		});   		 		 		
  		
  		
  		// Render toggle controls
  		objToggleSendToMe.render("#sendToToggles");		
		objToggleSendToClient.render("#sendToToggles");		
		objToggleSendToExternal.render("#sendToToggles");	
		objToggleSendToExternal2.render("#sendToToggles");
		
		refreshSendTo();
		
		/************************** BIND PRINT MODAL EVENTS *********************/
		
		/***
		* Trap the event when the user taps the close button.
		*/
		$("#printModalClose").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			$("#printModal").hide();
		});
		
		$("#downloadReport").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			// Show the loader graphic
			blockElement("#printModal");
			
			objApp.objSync.startSyncSilent(function(success)
			{
				if(success)
				{
					// The silent sync has completed successfully.
					// We can now launch the report.
					unblockElement("#printModal");
                    
                    // Create a token
                    var params = {};
                    params["email"] = localStorage.getItem("email");
                    params["password"] = localStorage.getItem("password");
                    
                    var url = objApp.apiURL + "account/create_token/" + Math.floor(Math.random() * 99999);
                    blockElement("#printModal");
                    
                    $.post(url, params, function(data)
                    {
                        unblockElement("#printModal"); 
                        
                        if(data.status != "OK")
                        {
                            alert("Unable to create access token");
                            return;
                        }
                        
                        var token = data.message;                   
                    
					
					    var downloadURL = objApp.apiURL + "reports/inspection/" + objApp.keys.inspection_id + "?token=" + token;
					    
					    if(objApp.phonegapBuild)
					    {
						    if(cb != null)
						    {     
							    window.plugins.childBrowser.showWebPage(downloadURL);
						    }							
					    }
					    else
					    {
						    $.download(downloadURL, [], "post");
					    }
                    }, "JSON");
				}
				else
				{
					unblockElement("#printModal");
					alert("Sorry, something went wrong whilst syncing your data back to the Planet Earth server.  Please try again later.");
				}
			});
		});	
		
		$("#sendReport").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();   
			
			var emailSubject = $("#emailSubject").val();
			var emailMessage = $("#emailMessage").val();
			var emailTo = $("#emailTo").val();
			
			if(emailSubject == "")
			{
				alert("Please enter a subject for the email message");
				$("#emailSubject").focus();
				return;
			}
			
			if(emailMessage == "")
			{
				alert("Please enter a message for the email body");
				$("#emailMessage").focus();
				return;
			}
			
			if(emailTo == "")
			{
				alert("Please choose at least one email recipient");
				$("#emailTo").focus();
				return;
			}
            
			// Show the loader graphic
			blockElement("#printModal");
			
			objApp.objSync.startSyncSilent(function(success)
			{
				if(success)
				{
					// The silent sync has completed successfully.
					// We can now send the report.
					var url = objApp.apiURL + "reports/send_inspection_report";
					
					var params = {};
					params["subject"] = emailSubject;
					params["recipients"] = emailTo;
					params["from"] = "noreply@planetearthapp.com";
					params["message"] = emailMessage;
					params["inspectionid"] = objApp.keys.inspection_id;
                    
                    // For authentication params
                    params["email"] = localStorage.getItem("email");
					params["password"] = localStorage.getItem("password");
                    params["anticache"] = Math.floor(Math.random() * 99999);  

					$.post(url, params, function(data)
					{
						unblockElement("#printModal");
                        
                        try {
                            data = jQuery.parseJSON(data);
                            
                            if(data.status == "OK")
                            {
                                $("#printModal").hide();
                                alert("Thank you.  The inspection report has been created and sent successfully.");
                            }
                            else
                            {
                                alert("Sorry, something went wrong whilst launching the report. " + data.message);
                            }                            
                            
                        } catch (e) {
                            // error
                            alert("Sorry, an error occured whilst trying to send the report");
                            return;
                        }                        
					}, "");						
				}
				else
				{
					unblockElement("#printModal");
					alert("Sorry, something went wrong whilst syncing your data back to the Planet Earth server.  Please try again later.");
				}
			});					
		});
	}		
	
	this.setReturnInspectionID = function(inspection_id)
	{
		localStorage.setItem("inspection_id", inspection_id);		
	}
    
    this.showHistoryModal = function()
    {
        $("#historyModal").show();
        $("#historyModalClose").unbind();
        
        $("#historyModalClose").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			$("#historyModal").hide();
		});
    }
    
    this.showContacts = function()
    {
        var userEmail = localStorage.getItem("email");
        var user_id = localStorage.getItem("user_id");
        
        if(user_id == "") {
            return;    
        }
        
		var clientEmail = "";
		var clientContactEmail1 = "";
        var clientContactEmail2 = "";
        var clientContactEmail3 = "";
        var clientExternalEmail = "";
		var siteContactEmail = "";
        var siteExtraContactEmail = "";
        
        $("#inspectionStep4 #btnStep4SendReport").unbind();
        
        var refreshSendTo = function()
		{
			var csv = "";
            
            $('#contacts_list .contactItems').each(function(){
                contact = $(this).val();
            
                if ($(this).is(':checked'))
                {
                    if (csv.indexOf(contact) == -1)
                    {
                        csv += contact + ",";
                    }
                }
            });
            
			$("#inspectionStep4 #emailTo").val(csv);
		};
        
        var checkContact = function(contact)
        {
            $('#contacts_list .contactItems').each(function(){
                val = $(this).val();
                if (val == contact)
                {
                    $(this).attr('checked', true);;
                }
            });
        }
        
        var split = function( val ) {
            return val.split( /,\s*/ );
        }
        
        var extractLast =function( term ) {
          return split( term ).pop();
        }
		
		// Load the client and site email address details
		var sql = "SELECT c.*, s.address1 as site_address1, s.address2 as site_address2, " +
                "s.email as site_email, s.external_email as site_external_email, " +
                "c1.first_name || ' ' || c1.last_name as contact1_name, c1.email as contact1_email, " +
                "c2.first_name || ' ' || c2.last_name as contact2_name, c2.email as contact2_email " +
			"FROM clients c " + 
			"INNER JOIN inspections i ON c.id = i.client_id " +
			"INNER JOIN sites s ON i.site_id = s.id " +
            "LEFT OUTER JOIN contacts c1 ON s.contact_id1 = c1.id " +
            "LEFT OUTER JOIN contacts c2 ON s.contact_id2 = c2.id " +
			"WHERE i.id = ?";
			
		objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(client)
		{
		    $('#contacts_list .contactItems').unbind();
			if(!client)
			{
				alert("Sorry, the client record could not be loaded.");
				return;
			}
			
			clientEmail = client.email;
            clientContactEmail1 = client.c1_email;
            clientContactEmail2 = client.c2_email;
            clientContactEmail3 = client.c3_email;
			clientExternalEmail = client.external_email;
			siteContactEmail = client.site_email;
            siteExtraContactEmail = client.site_external_email;
			
			var addressStr = client.site_address1;
			if((addressStr != "") && (client.site_address2 != ""))
			{
				addressStr += ", " + client.site_address2;
			}
            
            // Create an array to store the email addresses as we add them.
            // We will use this to avoid adding duplicates.
            var addedEmails = [];
			
			//$("#printModal #emailSubject").val("Planet Earth Inspection Report");
			//$("#printModal #emailMessage").val("Please find attached an inspection report for " + client.name + " at " + addressStr + ".");
            
            // Also load any contacts that the user has favourited
            var sql = "SELECT c.first_name || ' ' || c.last_name as contact_name, c.email as contact_email " +
                "FROM contacts c " +
                "INNER JOIN contactsfavourites cf ON c.id = cf.contact_id " +
                "WHERE cf.user_id = ? " +
                "AND cf.deleted = 0 " +
                "AND c.deleted = 0 " +
                "ORDER BY c.first_name";
                
                objDBUtils.loadRecordsSQL(sql, [user_id], function(param, favourites) {
                
                var html = '<ul>';
                html += '<li><input class="contactItems" type="checkbox" value="'+userEmail+'" id="userEmail" title="Me"><label for="userEmail">Me ('+userEmail+')</label></li>';
                var index = 1;
                
                if ((clientContactEmail1) && (addedEmails.indexOf(clientContactEmail1.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+clientContactEmail1+'" id="clientContactEmail1" title="Client Contact '+index.toString()+'"><label for="clientContactEmail1">Client Contact '+index.toString()+' ('+clientContactEmail1+')</label></li>';
                    addedEmails.push(clientContactEmail1.toLowerCase());
                }
                
                if ((clientContactEmail2) && (addedEmails.indexOf(clientContactEmail2.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+clientContactEmail2+'" id="clientContactEmail2" title="Client Contact '+index.toString()+'"><label for="clientContactEmail2">Client Contact '+index.toString()+' ('+clientContactEmail2+')</label></li>';
                    addedEmails.push(clientContactEmail2.toLowerCase());
                }
                
                if ((clientContactEmail3) && (addedEmails.indexOf(clientContactEmail3.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+clientContactEmail3+'" id="clientContactEmail3" title="Client Contact '+index.toString()+'"><label for="clientContactEmail3">Client Contact '+index.toString()+' ('+clientContactEmail3+')</label></li>';
                    addedEmails.push(clientContactEmail3.toLowerCase());
                }
                
                if ((siteContactEmail) && (addedEmails.indexOf(siteContactEmail.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+siteContactEmail+'" id="siteContactEmail" title="Site Contact"><label for="siteContactEmail">Site Contact ('+siteContactEmail+')</label></li>';
                    addedEmails.push(siteContactEmail.toLowerCase());
                }
                
                if ((siteExtraContactEmail) && (addedEmails.indexOf(siteExtraContactEmail.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+siteExtraContactEmail+'" id="siteExtraContactEmail" title="Site Ext. Contact"><label for="siteExtraContactEmail">Site Ext. Contact ('+siteExtraContactEmail+')</label></li>';
                    addedEmails.push(siteExtraContactEmail.toLowerCase());
                }
                
                if((client.contact1_email != null) && (client.contact1_email != "") && (addedEmails.indexOf(client.contact1_email.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="' + client.contact1_email + '" id="siteContact1Email" title="Site Contact 1"><label for="siteContact1Email">' + client.contact1_name + '</label></li>';
                    addedEmails.push(client.contact1_email.toLowerCase());
                }
                
                if((client.contact2_email != null) && (client.contact2_email != "") && (addedEmails.indexOf(client.contact2_email.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="' + client.contact2_email + '" id="siteContact2Email" title="Site Contact 2"><label for="siteContact2Email">' + client.contact2_name + '</label></li>';
                    addedEmails.push(client.contact2_email.toLowerCase());
                }  
                
                // Add Favourites to the list
                if(favourites)
                {
                    var maxLoop = favourites.rows.length;
                    
                    // Loop through all of the clients in the recordset.
                    for(r = 0; r < maxLoop; r++)
                    {
                        // Get the current row
                        var favourite = favourites.rows.item(r); 
                        
                        if((favourite.contact_email != "") && (addedEmails.indexOf(favourite.contact_email.toLowerCase()) == -1))
                        {
                            index++;
                            var UFID = "userFavourite" + index;
                            html += '<li><input class="contactItems" type="checkbox" value="' + favourite.contact_email + '" id="' + UFID + '" title="User Favourite"><label for="' + UFID + '">' + favourite.contact_name + '</label></li>';
                            addedEmails.push(favourite.contact_email.toLowerCase());
                        }                         
                    }                         
                }                          
                
                
                html += "</ul>";
                $('.inspectionDetails #contacts_list').html(html);
                
                $('#contacts_list .contactItems').bind('change', function(e){
                    refreshSendTo();
                });
                
                
                $("#emailTo").bind( "keydown", function( event ) {
                        if ( event.keyCode === $.ui.keyCode.TAB &&
                        $( this ).data( "autocomplete" ).menu.active ) {
                            event.preventDefault();
                        }
                    }).autocomplete({
                    source: function( request, response ) {
                      // delegate back to autocomplete, but extract the last term
                      response( $.ui.autocomplete.filter(
                        objApp.contacts, extractLast( request.term ) ) );
                    },
                    minLength: 0,
                    select: function( event, ui ) {
                        var terms = split( this.value );
                        // remove the current input
                        terms.pop();
                        var csv = $("#inspectionStep4 #emailTo").val();
                        if (csv.indexOf(ui.item.value) == -1)
                        {
                            // add the selected item
                            terms.push( ui.item.value );
                            checkContact(ui.item.value);
                            
                        }
                        // add placeholder to get the comma-and-space at the end
                        terms.push( "" );
                        this.value = terms.join(",");
                        return false;
                    }
                });                
                
                
            }, "");
		});
        
        $("#inspectionStep4 #btnStep4SendReport").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			//var emailSubject = $("#emailSubject").val();
			//var emailMessage = $("#emailMessage").val();
            var emailSubject = '';
			var emailMessage = '';
			var emailTo = $("#emailTo").val();
			
			if(emailSubject == "")
			{
                /*
				alert("Please enter a subject for the email message");
				$("#emailSubject").focus();
				return;
                */
                emailSubject = "JetQuo Inspection Report for " + self.objPopSites.getText();
			}
			
			if(emailMessage == "")
			{
				/*
                alert("Please enter a message for the email body");
				$("#emailMessage").focus();
				return;
                */
                emailMessage = "Hi there, please find attached a JetQuo inspection report for: <br/><br/>" +
                                "   Client: " + self.objPopBuilders.getText() + "<br/>" +
                                "   Site: " + self.objPopSites.getText() + "<br/>" +
                                "   Inspection Date: " + $("#inspection #inspection_date").val() + "<br/>" +
                                "   Passed: ";
                                
                var failed = $("#inspection #failed").val();
                if (failed)
                    emailMessage += " No<br/>";
                else
                    emailMessage += " Yes<br/>";
                    
                emailMessage += "<br/>Please do not reply to this email as it was automatically generated.";
			}
			
			if(emailTo == "")
			{
				alert("Please choose at least one email recipient");
				//$("#emailTo").focus();
				return;
			}
            
			// Show the loader graphic
			blockElement("#inspectionStep4");
			
			objApp.objSync.startSyncSilent(function(success)
			{
				if(success)
				{
					// The silent sync has completed successfully.
					// We can now send the report.
					var url = objApp.apiURL + "reports/send_inspection_report";
					
					var params = {};
					params["subject"] = emailSubject;
					params["recipients"] = emailTo;
					params["from"] = "noreply@planetearthapp.com";
					params["message"] = emailMessage;
					params["inspectionid"] = objApp.keys.inspection_id;
                    
                    // For authentication params
                    params["email"] = localStorage.getItem("email");
					params["password"] = localStorage.getItem("password");
                    params["anticache"] = Math.floor(Math.random() * 99999);
					
					$.post(url, params, function(data)
					{
						unblockElement("#inspectionStep4");
                        
                        try {
                            data = jQuery.parseJSON(data);
                            
                            if(data.status == "OK")
                            {
                                alert("Thank you.  The inspection report has been created and sent successfully.");
                            }
                            else
                            {
                                alert("Sorry, something went wrong whilst launching the report. " + data.message);
                            }                            
                        } catch (e) {
                            // error
                            alert("Sorry, an error occured whilst trying to send the report");
                            return;
                        }                        
					}, "");						
				}
				else
				{
					unblockElement("#inspectionStep4");
					alert("Sorry, something went wrong whilst syncing your data back to the Planet Earth server.  Please try again later.");
				}
			});					
		});
        
    }						
};
