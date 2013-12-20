<?php
class reports extends MY_Controller 
{
    function __construct()
    {
		parent::__construct();
        
		$this->load->model("inspection_model",'ismd');
        $this->load->model("account_model");
        $this->load->model("report_mdoel");
    }
    
    /***
    * Generate the inspection report using Jasper Reports
    * 
    * @param integer $inspectionID
    * @param mixed $save
    */
    function inspection( $inspectionID='', $save='', &$message = "" )
    {
        // Include required classes for generating the jasper report.
        require_once(ABSOLUTE_PATH . "classes/reportLauncher.class.php");
        require_once(ABSOLUTE_PATH . "classes/inspectionLauncher.class.php");
        
        // Make sure the inspection ID is valid
        if($inspectionID == "")
        {
            if($save != "")
            {
                $message = "Missing inspection ID";
                return false;
            }
            
            show_error("Missing inspection ID");   
        }
        
        // Load the inspection in question
        $inspection = $this->ismd->get_detail($inspectionID);
        if(!$inspection) show_error("Invalid inspection ID"); 
        
        $companyID = $inspection->company_id;
        
        // Make sure the user who has logged in has permission to view this report.
        if($this->user->company_id != $companyID)
        {
            $error = "Sorry, you do not have permission to perform this action.";
            
            if($save != "")
            {
                $message = $error;
                return false;
            }
            
            show_error($error);   
        }
        
        // Load the company record
        $company = $this->account_model->get_company($companyID);
        if(!$company)
        {
            if($save != "")
            {
                $message = "Invalid Company";
                return false;
            }
            
            show_error("Invalid company");
        }
        
        // Make sure this company has a positive credit balance.  If they don't, prevent the report launch
        if(($company->id != 1) && ($company->credits <= 0))
        {
            $error = "Sorry, you are out of credits.  Please top up your account to continue with this action.";
            
            if($save != "")
            {
                $message = $error;
                return false;
            }
            
            show_error($error);                 
        }
        
        // Before generating the report, set the required data into the POST array.
        $_POST["SUBREPORT_DIR"] = JASPER_SUBREPORT_PATH;
        $_POST["CompanyID"] = $companyID;
        $_POST["InspectionID"] = $inspectionID;
        $_POST["LogoPath"] = "";
        $_POST["PassImage"] = FCPATH . "assets/pass.gif";
        $_POST["FailImage"] = FCPATH . "assets/fail.gif";
        
        // Does the company have an uploaded logo file?  If so, check the file exists and pass it to the report.
        if($company->logo_path != "")
        {
            $logo_path = ADMIN_PATH . "userdata/" . $companyID . "/" . $company->logo_path;
            
            if(file_exists($logo_path))
            {
                $_POST["LogoPath"] = $logo_path;
            } 
        }
        
        // Create the report
        $objLauncher = new InspectionLauncher(); 
        
        if(!$objLauncher->createReport($error_message))
        {
            if($save != "")
            {
                $message = "An error occured whilst creating the report";
                return false;
            }
            
            show_error("Error creating report: " . $error_message);   
        }
        
        // The report was generated OK.
        if(!$objLauncher->getReport($reportData))
        {
            if($save != "")
            {
                $message = "The report could not be retrieved";
                return false;
            }
                        
            show_error("Error getting report data");       
        }  
        
        if ( empty($save)) 
        {
            // Output the report binary
            header("Content-type:application/pdf");

            // It will be called downloaded.pdf
            header("Content-Disposition:attachment;filename=inspection.pdf");        
            
            echo $reportData;            
        }
        else 
        {
            // Save the report locally
            // check inspection directory
            $inspectionDir = FCPATH . INSPECTION_FOLDER;
            
            if (!file_exists($inspectionDir))
            {
                @mkdir($inspectionDir);
                @chmod($inspectionDir, DIR_WRITE_MODE);
            }
            
            if (!file_exists($inspectionDir)) 
            {
                return false;
            }
            
            file_put_contents($inspectionDir . '/Inspection-'.$inspectionID.'.pdf', $reportData);
            return true;
        }                      
    }
    
    function print_report($report_type, $inspection_id)
    {
        if(empty($report_type)) {
            show_error("Invalid Report Type");        
        }
        
        if(empty($inspection_id)) {
            show_error("Invalid Inspection ID");        
        }        
        
        $report_data = $this->report_model->generate_report($report_type, $inspection_id, $message);
        if(!$report_data) {
            show_error("Report Failed To Generate: $message");    
        }
        

        // Output the report binary
        header("Content-type:application/pdf");

        // It will be called downloaded.pdf
        header("Content-Disposition:attachment;filename=inspection.pdf");        
        
        echo $reportData;                             
    }
    
    function print_report_handovers( $inspectionID='', $save='', &$message = "" )
    {
        // Include required classes for generating the jasper report.
        require_once(ABSOLUTE_PATH . "classes/reportLauncher.class.php");
        require_once(ABSOLUTE_PATH . "classes/handoversReportLauncher.class.php");
        
        // Make sure the inspection ID is valid
        if($inspectionID == "")
        {
            if($save != "")
            {
                $message = "Missing inspection ID";
                return false;
            }
            
            show_error("Missing inspection ID");   
        }
        
        // Load the inspection in question
        // $inspection = $this->ismd->get_detail($inspectionID);
        // if(!$inspection) show_error("Invalid inspection ID"); 
        
        // Before generating the report, set the required data into the POST array.
        // These are passed through to jasper as parameters
        $_POST["SUBREPORT_DIR"] = JASPER_SUBREPORT_PATH;    // This is important for any reports that contain sub reports
        $_POST["INSPECTION_ID"] = $inspectionID;
        
        // Create the report
        $objLauncher = new HandoverReportLauncher(); 
        
        if(!$objLauncher->createReport($error_message))
        {
            if($save != "")
            {
                $message = "An error occured whilst creating the report";
                return false;
            }
            
            show_error("Error creating report: " . $error_message);   
        }
        
        // The report was generated OK.
        if(!$objLauncher->getReport($reportData))
        {
            if($save != "")
            {
                $message = "The report could not be retrieved";
                return false;
            }
                        
            show_error("Error getting report data");       
        }  
        
        if ( empty($save)) 
        {
            // Output the report binary
            header("Content-type:application/pdf");

            // It will be called downloaded.pdf
            header("Content-Disposition:attachment;filename=inspection.pdf");        
            
            echo $reportData; 
			
			$this->uploadDropbox($inspectionID, $reportData);
			return true;
        }                      
    }
    
    function print_report_quality( $inspectionID='', $save='', &$message = "" )
    {
        // Include required classes for generating the jasper report.
        require_once(ABSOLUTE_PATH . "classes/reportLauncher.class.php");
        require_once(ABSOLUTE_PATH . "classes/qualityReportLauncher.class.php");
        
        // Make sure the inspection ID is valid
        if($inspectionID == "")
        {
            if($save != "")
            {
                $message = "Missing inspection ID";
                return false;
            }
            
            show_error("Missing inspection ID");   
        }
        
        // Load the inspection in question
        // $inspection = $this->ismd->get_detail($inspectionID);
        // if(!$inspection) show_error("Invalid inspection ID"); 
        
        // Before generating the report, set the required data into the POST array.
        // These are passed through to jasper as parameters
        $_POST["SUBREPORT_DIR"] = JASPER_SUBREPORT_PATH;    // This is important for any reports that contain sub reports
        $_POST["INSPECTION_ID"] = $inspectionID;
        
        // Create the report
        $objLauncher = new QualityReportLauncher(); 
        
        if(!$objLauncher->createReport($error_message))
        {
            if($save != "")
            {
                $message = "An error occured whilst creating the report";
                return false;
            }
            
            show_error("Error creating report: " . $error_message);   
        }
        
        // The report was generated OK.
        if(!$objLauncher->getReport($reportData))
        {
            if($save != "")
            {
                $message = "The report could not be retrieved";
                return false;
            }
                        
            show_error("Error getting report data");       
        }  
        
        if ( empty($save)) 
        {
            // Output the report binary
            header("Content-type:application/pdf");

            // It will be called downloaded.pdf
            header("Content-Disposition:attachment;filename=inspection.pdf");        
            
            echo $reportData;   

			$this->uploadDropbox($inspectionID, $reportData);
        }                   
    }
    
    function print_report_pci( $inspectionID='', $save='', &$message = "" )
    {
        // Include required classes for generating the jasper report.
        require_once(ABSOLUTE_PATH . "classes/reportLauncher.class.php");
        require_once(ABSOLUTE_PATH . "classes/pciReportLauncher.class.php");
        
        // Make sure the inspection ID is valid
        if($inspectionID == "")
        {
            if($save != "")
            {
                $message = "Missing inspection ID";
                return false;
            }
            
            show_error("Missing inspection ID");   
        }
        
        // Load the inspection in question
        // $inspection = $this->ismd->get_detail($inspectionID);
        // if(!$inspection) show_error("Invalid inspection ID"); 
        
        // Before generating the report, set the required data into the POST array.
        // These are passed through to jasper as parameters
        $_POST["SUBREPORT_DIR"] = JASPER_SUBREPORT_PATH;    // This is important for any reports that contain sub reports
        $_POST["INSPECTION_ID"] = $inspectionID;
        
        // Create the report
        $objLauncher = new PCIReportLauncher(); 
        
        if(!$objLauncher->createReport($error_message))
        {
            if($save != "")
            {
                $message = "An error occured whilst creating the report";
                return false;
            }
            
            show_error("Error creating report: " . $error_message);   
        }
        
        // The report was generated OK.
        if(!$objLauncher->getReport($reportData))
        {
            if($save != "")
            {
                $message = "The report could not be retrieved";
                return false;
            }
                        
            show_error("Error getting report data");       
        }  
        
        if ( empty($save)) 
        {
            // Output the report binary
            header("Content-type:application/pdf");

            // It will be called downloaded.pdf
            header("Content-Disposition:attachment;filename=inspection.pdf");        
            
            echo $reportData;            
			
			$this->uploadDropbox($inspectionID, $reportData);
        }                      
    }

    function inspection_pdf( $inspectionID='' )
    {
        $inspection = $this->ismd->get_detail($inspectionID);
        
        if ( !$inspection ) {
        	die('Inspection not found.');
        } else {
            $inspection->items = $this->ismd->get_defects($inspectionID);
            $data['inspection'] = $inspection;
            $this->load->view('inspection_pdf', $data);
        }
    }
    
    function send_inspection_report()
    {
        $aReturn = array(
           'status' => 'ERROR',
           'message' => 'Error occurred.',
           'errors' => null
        );        
        
        $this->load->library('form_validation');
        
        $this->form_validation->set_rules('subject', 'Subject', 'trim|required');
        $this->form_validation->set_rules('recipients', 'Recipients', 'trim|required|valid_emails');
        $this->form_validation->set_rules('from', 'From Email', 'trim|required|valid_email');
        $this->form_validation->set_rules('inspectionid', 'Inspection ID', 'trim|required|callback__checkInspection');
        
        $this->form_validation->set_message('required', '%s is required.');
        $this->form_validation->set_message('valid_emails', '%s must contain all valid email addresses.');
        $this->form_validation->set_message('valid_email', '%s must contain a valid email addresses.');
        
        if ( $this->form_validation->run() == FALSE )
        {
            $aReturn["errors"] = $this->form_validation->_error_array;
            send($aReturn);            
        } 
        
            // check inspection directory
        $inspectionDir = FCPATH . INSPECTION_FOLDER;
        if ( !file_exists($inspectionDir) )
        {
            @mkdir($inspectionDir);
            @chmod($inspectionDir, DIR_WRITE_MODE);
        }
        
        if ( !file_exists($inspectionDir))
        {
            $aReturn["message"] = "Cannot create inspection directory.";
            send($aReturn);            
        } 
        

        $inspectionID = trim($_POST['inspectionid']);
        $inspectionFile = $inspectionDir . "/Inspection-$inspectionID.pdf";

        $message = "";
        
        if((!$this->inspection($inspectionID, 'save', $message)) || ( !file_exists($inspectionFile)))
        {
            $aReturn["message"] = "The inspection report could not be generated: $message";
            send($aReturn);            
        }
        
        // Email the report
        $this->load->library('email');
        
        $this->email->set_mailtype('html');
        
        $this->email->to(trim($_POST['recipients']));
        //$this->email->to('dev3@simb.com.au');
        $this->email->from(trim($_POST['from']));
        $this->email->subject(trim($_POST['subject']));
        
        $message = isset($_POST['message']) ? trim($_POST['message']) : '';
        $this->email->message($message); 
        $this->email->attach($inspectionFile);
        $this->email->send();
        
        $aReturn["status"] = "OK";
        $aReturn["message"] = "";

        send($aReturn);
    }
    
    function _checkInspection( $str='' )
    {
        $this->load->model('inspection_model','ismd');
        $inspection = $this->ismd->get_detail($str);
        if ( $inspection ) {
        	return TRUE;
        } else {
            $this->form_validation->set_message('_checkInspection', '%s is incorrect.');
            return FALSE;
        }
    }
}