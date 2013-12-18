<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Welcome extends CI_Controller {

	/**
	 * Index Page for this controller.
	 *
	 * Maps to the following URL
	 * 		http://example.com/index.php/welcome
	 *	- or -  
	 * 		http://example.com/index.php/welcome/index
	 *	- or -
	 * Since this controller is set as the default controller in 
	 * config/routes.php, it's displayed at http://example.com/
	 *
	 * So any other public methods not prefixed with an underscore will
	 * map to /index.php/welcome/<method_name>
	 * @see http://codeigniter.com/user_guide/general/urls.html
	 */
	public function index()
	{
        require_once(ABSOLUTE_PATH . "classes/reportLauncher.class.php");
        require_once(ABSOLUTE_PATH . "classes/inspectionLauncher.class.php");
        
        $_POST["SUBREPORT_DIR"] = JASPER_SUBREPORT_PATH;
        $_POST["CompanyID"] = "1";
        $_POST["InspectionID"] = "WRzrH1332369139363";
        $_POST["LogoPath"] = "/home/simbqa/planetearth/api/assets/logo.gif";
        $_POST["PassImage"] = "/home/simbqa/planetearth/api/assets/pass.gif";
        $_POST["FailImage"] = "/home/simbqa/planetearth/api/assets/fail.gif";
        
        $objLauncher = new InspectionLauncher();

        if(!$objLauncher->createReport($error_message))
        {
            show_error("Error creating report: " . $error_message);   
        }
        
        // The report was generated OK.
        if(!$objLauncher->getReport($reportData))
        {
            show_error("Error getting report data");       
        }
        
        // Output the report binary
        header("Content-type:application/pdf");

        // It will be called downloaded.pdf
        header("Content-Disposition:attachment;filename='inspection.pdf'");        
        
        echo $reportData;
	}
}

/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */