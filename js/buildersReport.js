/**********************************************************
OBJECT: BUILDERS
***********************************************************/

/***
* @project: Blueprint Inspections iPad App
* @author: Andrew Chapman
* @copyright: SIMB Pty Ltd 2011
*/

var BuildersReport = function()
{
	var self = this;	// Store a reference to this object for use during callback methods

	// Declare popselectors
	this.objPopState = null;
	this.objPopCountry = null;
    this.scroller = null;		
	
	/***
	* setupbuilders clears the main stage and then shows a listing of builders.
	*/
	this.setupBuilders = function()
	{
		objApp.clearMain();
		objApp.callbackMethod = null;	// Reset callback method.		
		
		// Set the main heading
		objApp.setHeading("Blueprint Inspections");
		objApp.setSubHeading("Builders Report");
		objApp.setNavActive("#navBuildersReport");

		// Show the inspectionListing screen
		$("#builderReport").removeClass("hidden");  	
        

		$("#builderReport #btnShowReport").unbind();
		
		$("#builderReport #btnShowReport").bind(objApp.touchEvent, function()
		{
			self.doBuilderSearch();
			return false;
		});

        var d = new Date();
        var toDate = d.getFullYear() + "-" +  (d.getMonth()+1 > 10 ? (d.getMonth()+1) : "0"+(d.getMonth()+1) ) + "-" +  d.getDate();
        var fromDate = d.getFullYear() + "-" +  (d.getMonth() > 10 ? d.getMonth() : "0"+d.getMonth() ) + "-" +  d.getDate();
        $("#builderReport #date_from").attr("value", fromDate);
        $("#builderReport #date_to").attr("value", toDate);
        
        objDBUtils.orderBy = "";
        objDBUtils.loadSelect("builders", ["id","name"], "#builderReport #builder_id", function(){}, "option"); 
        
        if($("#builderReport #builder_id option").hasClass('empty') === false)
        {
            $("#builderReport #builder_id").prepend("<option class='empty' value='' selected='selected'>Select</option>");    
        }
        
        $(".select2").select2({});
	}

	/***
	* doBuilderSearch searches the builders database
	* using the user entered search term.  The builder name
	* is used to match the builder record.
	*/
	this.doBuilderSearch = function()
	{
        objApp.showHideSpinner(true, "#builderReport");        
                    
		
        
        // Kill iScroll if it already exists
        if(this.scroller) {
            this.scroller.destroy();
            this.scroller = null;
        }        
        
                                
		var from = $("#builderReport #date_from").val();
        var to = $("#builderReport #date_to").val();
        var builder_id = $("#builderReport #builder_id").val();
        if(builder_id == "")
        {
            alert("Sorry, Please select the builder");
            objApp.showHideSpinner(false, "#builderReport");      
            return;            
        }               
        
		var sql = "SELECT report_type, COUNT(id) as qty FROM inspections WHERE deleted = 0 AND builder_id = ? AND (modified BETWEEN ? AND ? )  GROUP BY report_type ORDER BY report_type ASC";
	    //var sql = "SELECT * FROM inspections";
		
		// Apply any additional search filters 	      
               
	    
	    
	    objDBUtils.loadRecordsSQL(sql, [builder_id, from, to], function(param, items)
	    {
	       objApp.showHideSpinner(false, "#builderReport"); 
           $("#builder_report_message").html("");
		    // Remove any element block		 
            if(!items)
            {                  
                $("#builder_report_message").html("There is no data available for this builder");         
                $("#chart_wrapper").hide();  
                return;
            }                                 
		      
		    // Build the HTML for the builder listing table
			$("#chart_wrapper").show();
			
			var maxLoop = items.rows.length;
			var r = 0;
			
            var data = new google.visualization.DataTable();                    
              data.addColumn('string', 'Report type');
              data.addColumn('number', 'Quantity');
                                  
			// Loop through all of the builders in the recordset.
			for(r = 0; r < maxLoop; r++)
			{			    
				// Get the current row
			    var row = items.rows.item(r);
                data.addRow([row.report_type, row.qty]);
			}
            
            var options = {
                title: '',
                width: '100%',
                height: '100%',     
                is3D: true,
                pieSliceText: 'percentage',               
            };    
            
            chart2.draw(data, options);       

	    }, "");
 
	}
    
			
};
