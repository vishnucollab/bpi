<?php
class Sync_prefixes extends CI_Controller 
{
	function __construct()
	{
		parent::__construct();
		
		$this->load->model("Sync_prefixes_model");	
	}
	
	function get()
	{
		$prefix = $this->Sync_prefixes_model->get_prefix();
		echo json_encode(array("prefix" => $prefix));
	}
}

/* End of file sync_prefixes.php */
/* Location: ./system/application/controllers/sync_prefixes.php */