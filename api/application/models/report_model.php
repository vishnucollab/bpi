<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');   

class Report_model extends CI_Model 
{
	private $CI;
	
	function Report_model()
	{
		parent::__construct();      
        $this->CI = & get_instance();
	}
    
    function generate_report($report_type, $inspection_id, &$message = "")
    {
        // Ensure the report type is valid
        $valid_report_types = array("PCI", "Quality Inspection", "Handovers");
        
        if(!in_array($report_type, $valid_report_types)) {
            $message = "Invalid Report Type: $report_type";
            return false;    
        }
        
        if(empty($inspection_id)) {
            $message = "Invalid Inspection ID";
            return false;            
        }
        
        // Attempt to load the inspection
        $this->CI->load->model("inspection_model");
        
        $inspection = $this->CI->inspection_model->get_detail($inspection_id);
        if(!$inspection) {
            $message = "Invalid Inspection";
            return false;             
        }
        
        // Before generating the report, set the required data into the POST array.
        // These are passed through to jasper as parameters
        $_POST["SUBREPORT_DIR"] = JASPER_SUBREPORT_PATH;    // This is important for any reports that contain sub reports
        $_POST["INSPECTION_ID"] = $inspection_id;        

        // Include required classes for generating the jasper report.
        if(!class_exists("ReportLauncher")) {
            require_once(ABSOLUTE_PATH . "classes/reportLauncher.class.php");
        }
        
        
        // Create the report object
        $objLauncher = false;
        
        if($report_type == "Handovers") {
            if(!class_exists("HandoverReportLauncher")) {
                require_once(ABSOLUTE_PATH . "classes/handoversReportLauncher.class.php");        
            }
            
            $objLauncher = new HandoverReportLauncher();
        } else if($report_type == "PCI") {
            if(!class_exists("PCIReportLauncher")) {
                require_once(ABSOLUTE_PATH . "classes/pciReportLauncher.class.php");        
            }
            
            $objLauncher = new PCIReportLauncher();            
        } else if($report_type == "Quality Inspection") {
            if(!class_exists("qualityReportLauncher")) {
                require_once(ABSOLUTE_PATH . "classes/qualityReportLauncher.class.php");        
            }
            
            $objLauncher = new QualityReportLauncher();            
        }
        
        if(!$objLauncher) {
            $message = "Invalid Report Object";
            return false;             
        }
        
        // Generate the report'
        if(!$objLauncher->createReport($error_message)) {
            $message = "An error occured whilst creating the report";
            return false;
        }
        
        // The report was generated OK.
        if(!$objLauncher->getReport($reportData)){
            $message = "The report could not be retrieved";
            return false;      
        }  
        
        return $reportData;       
    }
    
    function upload_to_dropbox($source_file, $dest_folder, $dest_file_name, &$message = "")
    {
        if (!file_exists($source_file))  {
            $message = "Source File: $source_file Does Not Exist";
            return false;
        }
    
        if(!class_exists("DropboxUploader")) {
            require_once(ABSOLUTE_PATH . "classes/DropboxUploader.php");
        }
            
        try {
            $uploader = new DropboxUploader(DROPBOX_USER, DROPBOX_PASSWORD);
            $uploader->upload($source_file, $dest_folder, $dest_file_name);

            return true;
            
        } catch(Exception $e) {
            $message = $e->getMessage();
            return false;
        }
    } 
    
    function update_dropbox_sent($dropbox_sent_id, $foreign_type, $foreign_id, $modified_dtm = "") 
    {
        $save = array();
        
        if(empty($modified_dtm)) {
            $modified_dtm = date("Y-m-d H:i:s");  
        }
        
        $save["sent_dtm"] = $modified_dtm;
        
        // If were inserting a new dropbox sent record,
        // set the foreign type and id, and insert it and return the new id
        if(empty($dropbox_sent_id)) {
            $save["foreign_type"] = $foreign_type;     
            $save["foreign_id"] = $foreign_id;
            
            if(!$this->db->insert("dropbox_sent", $save)) {
                return false;
            }
            
            return $this->db->insert_id();
        }
        
        // If we reach here then we're updating an existing record
        $this->db->where("id", $dropbox_sent_id);
        if(!$this->db->update("dropbox_sent", $save)) {
            return false;
        }
        
        return $dropbox_sent_id;       
    }       
}
