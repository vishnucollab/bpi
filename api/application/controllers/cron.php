<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Cron extends CI_Controller 
{
	function __construct()
	{
		parent::__construct();
	}
    
    public function index()
    {
        show_error("404 Error");
    }    
		
	public function send_reports_to_dropbox()
	{
        $this->load->model("inspection_model");
        $this->load->model("report_model");
        $this->load->model("inspectionitemphotos_model");
        
        // Get a list of inspections that have been finalised but have NOT been sent to dropbox or have been updated
		$inspections = $this->inspection_model->get_inspections_for_dropbox();
        if(!$inspections) {
            print "Nothing to send";
            exit();
        }
        
        $inspection_dir = FCPATH . INSPECTION_FOLDER;
        
        // Loop through all the inspections
        foreach($inspections->result() as $inspection) {
            $inspection_id = $inspection->id;
            $modified_dtm = $inspection->modified;
            $report_type = $inspection->report_type;
            
            // if the inspection has been sent to dropbox in the past, this will be the id of the dropbox sent record
            // Otherwise this will be empty/null.
            $dropbox_sent_id = $inspection->dropbox_sent_id;      

            $report_name = "Inspection-" . $inspection_id . ".pdf";
            $report_path = $inspection_dir . "/" . $report_name;
			$folder_upload = DROPBOX_FOLDER . "/" . $inspection->report_type . '/' . $inspection->inspection_date . '/' . $inspection_id . '/';
			
            $report_data = $this->report_model->generate_report($report_type, $inspection_id, $message);
            if(!$report_data) {
                $this->handle_error("Couldn't generate report data for inspection: $inspection_id, $message");
            }
            
            file_put_contents($report_path, $report_data);
            
            if(!file_exists($report_path)) {
                $this->handle_error("Couldn't generate report for inspection id $inspection_id");
            }   
            
            // Upload the file to dropbox
            if(!$this->report_model->upload_to_dropbox($report_path, $folder_upload, $report_name, $message)) {
                $this->handle_error("Couldn't upload report to dropbox, $report_path, $message");    
            }
			
            // Update the dropbox meta data with the sent date/time 
            // We mark the dropbox sent item with the modified date of the inspection item.
            $this->report_model->update_dropbox_sent($dropbox_sent_id, "inspections", $inspection_id, $modified_dtm);
        
			// Upload photos to dropbox
            $photos = $this->inspectionitemphotos_model->get_photos_for_dropbox($inspection->id);
			if(!$photos) {
				continue;
			}
			foreach($photos->result() as $photo)
			{
				
				$photoDir = $inspection_dir . "/" . $inspection->id;
			
				if (!file_exists($photoDir))
				{
					@mkdir($photoDir);
					@chmod($photoDir, DIR_WRITE_MODE);
				}
				
				if (!file_exists($photoDir))
				{
					return;
				}
			
				$photo_path = $inspection_dir . "/" . $inspection->id . '/' . $photo->id . '.jpg';
				file_put_contents($photo_path, base64_decode($photo->photodata_tmb));
            
				if(!file_exists($photo_path)) {
                $this->handle_error("Couldn't generate report for inspection id $inspection_id");
				}   
				
				// Upload the file to dropbox
				if(!$this->report_model->upload_to_dropbox($photo_path, $folder_upload, $photo->id . '.jpg', $message)) {
					$this->handle_error("Couldn't upload report to dropbox, $report_path, $message");    
				}
				
				// Update the dropbox meta data with the sent date/time 
				// We mark the dropbox sent item with the modified date of the inspectionphoto item.
				$this->report_model->update_dropbox_sent($photo->dropbox_sent_id, "inspectionitemphotos", $photo->id . '.jpg', $photo->modified);
			}
		}
	}
    
    private function handle_error($error) {
        show_error($error);
        exit();    
    }
}

/* End of file cron.php */
/* Location: ./application/controllers/cron.php */