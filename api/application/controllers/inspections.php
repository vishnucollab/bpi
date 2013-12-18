<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Inspections extends CI_Controller 
{
	private $user;
	private $version;
	
	function __construct()
	{
		parent::__construct();
		
		$this->load->model("account_model");
		$this->load->library('form_validation');
		
		$this->user = false;
	}
		
	public function get_inspection_photo($photoID)
	{
		$this->load->model("inspectionitemphotos_model");
		
		$return = array();
		$return["status"] = "ERROR";
		$return["message"] = "";	
		
		// Check for valid login credentials
		$this->user = $this->account_model->check_login($error_code);
		
		if(!$this->user)
		{
			// Login failed
			$return["status"] = "ERROR";
			$return["message"] = $error_code;				
			send($return);
		}			
		
		if($photoID == "")
		{
			$return["status"] = "ERROR";
			$return["message"] = "Invalid photo ID";
			send($return);			
		}
		
		// Load the photo record
		$photo = $this->inspectionitemphotos_model->get_photo($this->user->company_id, $photoID);
		if(!$photo)
		{
			$return["status"] = "ERROR";
			$return["message"] = "Invalid photo ID";
			send($return);				
		}
		
		// Save the photodata into our return array and shoot it back
		$return["photo"] = $photo->photodata;
		$return["status"] = "OK";
		
		send($return);
	}
	
	public function do_login()
	{
		$return = array();
		$return["status"] = "ERROR";
		$return["message"] = "";
		
		// Check if the login is correct.
		$this->user = $this->account_model->check_login($error_code);
		
		if(!$this->user)
		{
			// Login failed
			$return["status"] = "ERROR";
			$return["message"] = $error_code;				
			send($return);
		}
		
		// Login was OK
		// Load the users company object
		$company = $this->account_model->get_company($this->user->company_id);
		
		if((!$company) || ($company->enabled == 0))
		{
			// Couldn't load company or company disabled
			$return["status"] = "ERROR";
			$return["message"] = "COMPANY_INVALID";				
			send($return);				
		}
		
		
		// Send the users personal data back to the client
		$return["status"] = "OK";
		$return["user_id"] = $this->user->id;
		$return["first_name"] = $this->user->first_name;
		$return["last_name"] = $this->user->last_name;
		$return["email"] = $this->user->email;
		$return["company_id"] = $this->user->company_id;
		$return["company_name"] = $company->company_name;
		$return["country"] = $company->country;
		
		send($return);
	}
	
	public function upload_photo()
	{
		$this->load->model("inspectionitemphotos_model");
		
		$return = array();
		$return["status"] = "ERROR";
		$return["message"] = "";	
		
		// Check for valid login credentials
		$this->user = $this->account_model->check_login($error_code);
		
		if(!$this->user)
		{
			// Login failed
			$return["status"] = "ERROR";
			$return["message"] = $error_code;				
			send($return);
		}			
		
		// Define validation rules for uploading a photo
		$this->form_validation->set_rules('id', 'ID', 'required|xss_clean|max_length[20]');
		$this->form_validation->set_rules('inspection_id', 'Inspection ID', 'required|xss_clean|max_length[20]');
		$this->form_validation->set_rules('seq_no', 'Sequence Number', 'required|xss_clean|integer');
		$this->form_validation->set_rules('photodata_tmb', 'Thumbnail Photodata', 'required|xss_clean');
		$this->form_validation->set_rules('deleted', 'Deleted', 'required|xss_clean|integer');
		$this->form_validation->set_rules('photodata', 'Photodata', 'xss_clean');
		$this->form_validation->set_rules('notes', 'Notes', 'xss_clean');
		
		// Make sure the submission is valid.
		if ($this->form_validation->run() == FALSE)
		{
			$return["status"] = "ERROR";
			$return["message"] = validation_errors("- ", "\n");				
			send($return);
		}	
		
		// The submission is valid.  Save the photo
		$id = $this->input->post("id");	
		
		$data = array();
		$data["inspection_id"] = $this->input->post("inspection_id");
		$data["seq_no"] = $this->input->post("seq_no");
		$data["photodata_tmb"] = $this->input->post("photodata_tmb");
		$data["photodata"] = $this->input->post("photodata");
		$data["notes"] = $this->input->post("notes");
		$data["deleted"] = $this->input->post("deleted");
		
		if(!$this->inspectionitemphotos_model->save($this->user, $id, $data))
		{
			$return["status"] = "ERROR";
			$return["message"] = "An error occured whilst trying to save the photo";			
			send($return);			
		}
		
		// All done.  The photo was inserted or updated as appropriate.
		
		// Save the photodata into our return array and shoot it back
		$return["status"] = "OK";
		send($return);
	}	
}

/* End of file inspections.php */
/* Location: ./application/controllers/inspections.php */