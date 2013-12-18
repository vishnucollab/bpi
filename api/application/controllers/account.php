<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Account extends CI_Controller 
{
	private $user;
	private $syncStart;
	private $version;
	
	function __construct()
	{
		parent::__construct();
		
		$this->load->model("account_model");
		
		$this->user = false;
		$this->syncStart = date("Y-m-d H:i:s");  
	}
		
	public function index()
	{
		show_error("404 Error");
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
/*		$company = $this->account_model->get_company($this->user->company_id);
		
		if((!$company) || ($company->enabled == 0))
		{
			// Couldn't load company or company disabled
			$return["status"] = "ERROR";
			$return["message"] = "COMPANY_INVALID";				
			send($return);				
		}*/
		
		
		// Send the users personal data back to the client
		$return["status"] = "OK";
		$return["user_id"] = $this->user->id;
		$return["first_name"] = $this->user->first_name;
		$return["last_name"] = $this->user->last_name;
		$return["email"] = $this->user->email;
		//$return["initials"] = $this->user->initials;
		$return["restricted"] = $this->user->restricted;
		//$return["company_id"] = $this->user->company_id;
		//$return["company_name"] = $company->company_name;
		//$return["country"] = $company->country_id;
		
		send($return);
	}


	public function retrieve_password()
	{
		$return = array();
		$return["status"] = "ERROR";
		$return["message"] = "";
		$return["email"] = $this->input->post('email');
		
		//check if the e-mail exists..

        $this->db->where("email", $this->input->post('email'));
        $result = $this->db->get("users");
        
        if($result->num_rows()==1) {
		//email fouind lets e-mail the user a verification code..
		$code = rand(1,9).rand(0,9).rand(0,9).rand(1,9);
		
		$user = $result->row();
		
		//save the code to the database for verification..

		$this->load->library('email');
		$this->email->set_mailtype("html");
		$this->email->from('accounts@blueprint.com', 'Blueprint');
		$this->email->to($this->input->post('email'));
		$this->email->subject('Blueprint Password Verification Code');
		$message = "
			<html>
				<head><title>Blueprint Change Password</title></head>
				<body style='text-align:center'>
					<br /><br />
					<table style='width:800px; border: 1px solid #333;font-family:arial;text-align: left; padding: 40px'>
						<tr>
							<th style='background:#2a3e83; padding: 5px; font-size: 18px; font-weight: bold;text-align:left;color:#ffffff; border: 1px solid #333'>Blueprint Inspections</th>
						</tr>
						<tr>
							<td style='padding: 5px'>
								<p>&nbsp;</p>
								<p>Hi {$user->first_name},</p>
								<p>Your password verification code is: <b>{$code}</b></p>
								<p>Thank You!</p>
								<p><i>The Blueprint Inspections Team</i></p>
								<p>&nbsp;</p>
							</td>
						</tr>
					</table>
				</body>
			</html>
		";
		$this->email->message($message);
		
			if($this->email->send()){
				$return["status"] = "OK";
				$return["code"] = $code;
			}
		}
		
		send($return);
	}

	function change_password(){
		$return = array();
		$return["status"] = "OK";
		
        $this->db->where("email", $this->input->post('email'));
        $result = $this->db->get("users");
		$user = $result->row();
		
		//update the password..
		if(strlen($this->input->post('password')) > 4 ) {
			$password = md5(strtolower($this->input->post('password')) . $user->salt);
			$this->db->where("id", $user->id);
			if(!$this->db->update("users", array("password" => $password))){
				$return["status"] = "ERROR";
			}
		} else {
			$return["status"] = "ERROR";
		}
		send($return);
	}
	
	function _create_account()
	{
		die("OFFLINE");
		$data = array();
		$data["first_name"] = "Andrew";
		$data["last_name"] = "Chapman";
		$data["email"] = "andy@simb.com.au";
		$data["password"] = "mango77z";
		
		$this->account_model->create_account($data);
		
		die("CREATED ACCOUNT " . $data["email"]);
	}
    
    function create_account()
	{
		$this->load->library('form_validation');
        // Define validation rules for creating an account
        $this->form_validation->set_rules('n_email', 'Email', 'trim|required|valid_email|callback__check_email_existed');
        $this->form_validation->set_rules('n_password', 'Password', 'trim|required|min_length[5]|matches[n_repassword]');
        $this->form_validation->set_rules('n_repassword', 'Password Repeat', 'trim|required');
        //$this->form_validation->set_rules('n_initials', 'Initials', 'trim|required');
        $this->form_validation->set_rules('n_first_name', 'First Name', 'trim|required');
        $this->form_validation->set_rules('n_last_name', 'Last Name', 'trim|required');
		$this->form_validation->set_rules('n_mobile', 'Mobile', 'trim|required');
        //$this->form_validation->set_rules('n_address1', 'Address 1', 'trim|required');
        //$this->form_validation->set_rules('n_address2', 'Address 2', 'trim');
        //$this->form_validation->set_rules('n_company_name', 'Company Name', 'trim|required');
        //$this->form_validation->set_rules('n_state', 'State', 'trim|required');
        //$this->form_validation->set_rules('n_country', 'Country', 'trim|required');
        //$this->form_validation->set_rules('n_postcode', 'Postcode', 'trim|required');
        
        $this->form_validation->set_error_delimiters('<span class="errmsg">', '</span>');
        $this->form_validation->set_message('required', '%s is required.');
        $this->form_validation->set_message('valid_email', 'Invalid email address.');
        $this->form_validation->set_message('matches', '%s does not match %s.');
        $this->form_validation->set_message('min_length', '%s must be at least %s characters.');
        
        // Make sure the submission is valid.
		if ($this->form_validation->run() == FALSE)
		{
			$return["status"] = "ERROR";
			$return["message"] = validation_errors("", "<br/>");				
			send($return);
		}
        
        $data = array();
        $data["email"] = $this->input->post("n_email");
        $data["password"] = $this->input->post("n_password");
       // $data["initials"] = $this->input->post("n_initials");
        $data["first_name"] = $this->input->post("n_first_name");
        $data["last_name"] = $this->input->post("n_last_name");
      //  $data["address1"] = $this->input->post("n_address1");
       // $data["address2"] = $this->input->post("n_address2");
       // $data["suburb"] = $this->input->post("n_city");
		//$data["company_name"] = $this->input->post("n_company_name");
        //$data["state_id"] = $this->input->post("n_state");
        //$data["country_id"] = $this->input->post("n_country");
       // $data["postcode"] = $this->input->post("n_postcode");
        //$data["fax"] = $this->input->post("n_fax");
        //$data["phone"] = $this->input->post("n_phone");
        $data["mobile"] = $this->input->post("n_mobile");
		
		if(!$this->account_model->create_account($data))
		{
			$return["status"] = "ERROR";
			$return["message"] = "An error occured whilst trying to create account";			
			send($return);
		} else {
			$return["status"] = "OK";
			send($return);
		}
        
        // The account was created successfully.
        // Send the welcome email to the user
        $this->load->model("Email_model");
        
        $email_data = array();
        $email_data["first_name"] = $this->input->post("n_first_name");
        $email_data["email"] = $this->input->post("n_email");
        $email_data["password"] = $this->input->post("n_password");
        
        //$this->Email_model->send_email($email_data["email"], "new_account_registration", $email_data,  $attach = "", $bcc = array("john@theplanetearth.com.au"));
		
		// All done.  
		$return["status"] = "OK";
		send($return);
	}
    
    
    function _check_email_existed($str = '')
    {
        $id = isset($_POST['id']) ? $_POST['id'] : false;
        $check = $this->account_model->get_account($str);
        if ( $check AND $check->id != $id ) {
			$this->form_validation->set_message('_check_email_existed', 'Sorry this email address is already in use.  Do you already have an account?');
			return FALSE;
		} else {
			return TRUE;
		}
    }
    
	
	function process_data($refresh_sync = "false")
	{
		$return = array(); 
		
		// Check if the login is correct.
		$this->user = $this->account_model->check_login($error_code);
		
		if(!$this->user)
		{
			// Login failed
			$return["status"] = "ERROR";
			$return["message"] = $error_code;				
			send($return);
		}		
		
		// Set the version number if possible.
		if((isset($_POST["version"])) && (is_numeric($_POST["version"])))
			$this->version = $_POST["version"];
		
		// Is there data to process
		if((isset($_POST["data"]))	&& ($_POST["data"] != ""))
		{
			// Grab the data
			$data = $_POST["data"];
                          
			$ignore_columns = array("dirty");
			//$allowed_tables = array("clients", "sites", "resources", "inspections", "inspectionitems", "inspectionitemphotos", "contacts", "contactsfavourites");
			$allowed_tables = array("builders", "resources", "inspections", "inspectionitems", "users", "reinspectionitems", "reinspections");

			
			// Time to process the data
			// Separate the tables
			$tables = explode(TABLESEP, $data);
			$num_tables = count($tables);			
			
			doLog("Data for $num_tables tables found");
			
			// Loop through all of the table data and process
			foreach($tables as $table)
			{			
				// Get the row data
				$rows = explode(ROWSEP, $table);
				$num_rows = count($rows);
				
				// There must be at least 3 rows (table name, header line, data line 1) in order
				// to process.
				if($num_rows < 3)
					continue;
					
				$table_name = $rows[0];
				$header = $rows[1];
				
				if(!in_array($table_name, $allowed_tables))
				{
					doLog("Blocked table: $table_name. Skipping.");
					continue;
				}			
				
				// Get the header fields into an array
				$headers = explode(FIELDSEP, $header);
				$num_headers = count($headers);
				
				// If there are less then 3 fields, there must be a problem.
				if($num_headers < 3)
				{
					doLog("Invalid header count $num_headers.");
 					$return["status"] = "ERROR";
 					send($return);	
				}

				// Loop through all of the data rows (starting from row 2)
				for($rowIdx = 2; $rowIdx < $num_rows; $rowIdx++)
				{
					$row = $rows[$rowIdx];
					
					$columns = explode(FIELDSEP, $row); 
					$num_columns = count($columns);
					
					if($num_columns < 3)
						continue;
					
					if($num_headers != $num_columns)
					{
 						$return["status"] = "ERROR";
						send($return);						
					}
					
					// Prepare an array for saving into the db and extra the data into into
					$save_data = array();
					
					$colIdx = 0;
					foreach($headers as $field)
					{
						// If this column is not to be ignored, add it to the save data array.
						if(!in_array($field, $ignore_columns))
						{
							if($columns[$colIdx] != NULLFIELD)
								$save_data[$field] = $columns[$colIdx];
							else
								$save_data[$field] = null;
						}
							
						$colIdx++;
					}
					
					// If there is an ID column present, update/insert the record as normal.
					if(isset($save_data["id"]))
					{
						$record_id = $save_data["id"];
						
						// The record id should NEVER be blank.
						if($record_id == "")
						{
 							$return["status"] = "ERROR";
 							send($return);
						}
						
						// See if this record exists or not.
						$this->db->where("company_id", $this->user->company_id);
						$this->db->where("id", $record_id);
						
						$query = $this->db->get($table_name);
						
						if($query->num_rows() > 0)
						{
							// UPDATE
							// A record with this id already exists.
							$save_data["modified"] = date("Y-m-d H:i:s"); 
							$save_data["modified_by"] = $this->user->id;
													
							$this->db->where("company_id", $this->user->company_id);
							$this->db->where("id", $record_id);

							if(!$this->db->update($table_name, $save_data))
							{
								doLog("Insert error: " . serialize($save_data));
 								$return["status"] = "ERROR";
 								send($return);				
							}												
						}
						else
						{
							// INSERT
							// This record does NOT exist yet in the database.
							
							// Append additional metadata to save data array.
							$save_data["company_id"] = $this->user->company_id;
							$save_data["created"] = date("Y-m-d H:i:s");
							$save_data["created_by"] = $this->user->id;
							$save_data["modified_by"] = $this->user->id;
							
							if(!$this->db->insert($table_name, $save_data))
							{
								doLog("Insert error: " . serialize($save_data));
 								$return["status"] = "ERROR";
 								send($return);				
							}
						}
						
						$query->free_result();
					}
					else
					{
						// Handle non-standard tables
						doLog("Unsure or how to handle non-standard table: $table_name");
 						$return["status"] = "ERROR";
 						send($return);				
					}
				}
					
				//doLog("Processing table $table_name, $header");
			}
		}
		
		// Get data from the DB to send back to the caller
		if($refresh_sync == "true")
		{
			$this->get_data($return, true);
		}
		else
		{
			$this->get_data($return, false);
		}
		
 		// Update the users last sync date flag
  		$this->account_model->update_last_sync_date($this->user->id);
        
        // Update the credit balance for this account.
        $this->account_model->update_credit_balance($this->user->company_id);		
		
		// Set the OK flag and send the data back to the client.
		$return["status"] = "OK";
		send($return); 		
	}
		
	private function get_data(&$return_data, $get_all = false)
	{	
		
		$return_data["tables"] = array();
		
		$last_sync_date = $this->user->last_sync_date;
		
		if(($last_sync_date == null) || ($last_sync_date == ""))
			$last_sync_date = "2011-01-01 00:00:00";
		$tables = array("builders", "resources", "inspections", "inspectionitems", "users", "reinspectionitems", "inspectionitemphotos", "reinspections");
		
		// Loop through each table
		foreach($tables as $table)
		{
			// Unless the $get_all flag is set, only grab data that
			// was last modified after the users last sync and BEFORE
			// the users sync start.
			
			// When downloading the data for the inspectionitemphotos table we do NOT want
			// the photocontent column, so do a manual select for this table.
			if($table == "inspectionitemphotos")			
			{
				$this->db->select("id, company_id, inspection_id, seq_no, photodata_tmb, notes, deleted, created_by");
				
				$this->db->order_by("created", "DESC");
				$this->db->limit(100);
			}
			else
			{
				$this->db->select("*");	
			}
			
			$this->db->where("company_id", $this->user->company_id);
			
			if((!$get_all) && ($table != "users"))
			{                        
				$this->db->where("modified >", $last_sync_date);	
				$this->db->where("modified <", $this->syncStart);
				//$this->db->where("deleted", 0);
			}

			doLog("Getting data for table: $table");
			
			$query = $this->db->get($table);  
			
			doLog("Found rows: " . $query->num_rows());
			
			// If there's no data for this table, skip it completely.
			if($query->num_rows() == 0)
				continue;
		
			// Add this table name to the tables array in the return data.
			array_push($return_data["tables"], $table);
			
			$return_data[$table] = array();
			
			// Loop through the rows
			foreach($query->result() as $row)
			{
				$data = get_object_vars($row);
				
				// Remove unwanted fields
				if(array_key_exists("company_id", $data)) unset($data["company_id"]);
				if(array_key_exists("created", $data)) unset($data["created"]);  
				if(array_key_exists("modified", $data)) unset($data["modified"]);  
				if(array_key_exists("modified_by", $data)) unset($data["modified_by"]);
				//if(array_key_exists("created_by", $data)) unset($data["created_by"]);	
				
				if(($table == "sites") && ($this->version < 7))
				{
					if(array_key_exists("external_contact", $data)) unset($data["external_contact"]);
					if(array_key_exists("external_email", $data)) unset($data["external_email"]);
				}	
                
                if($table == "users")
                {
                    if(array_key_exists("password", $data)) unset($data["password"]);
                    if(array_key_exists("salt", $data)) unset($data["salt"]);
                    if(array_key_exists("last_sync_date", $data)) unset($data["last_sync_date"]);
                    if(array_key_exists("is_actived", $data)) unset($data["is_actived"]);
                    if(array_key_exists("validated", $data)) unset($data["validated"]);
                    if(array_key_exists("referral_id", $data)) unset($data["referral_id"]);
                }                				
				
				// Add the array to the return data stack
				$return_data[$table][] = $data;
			}			
		}		
	}
    
    public function create_token()
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
        
        // The user login was correct.  Create the token and send it back
        $token = random_string('alnum', 15);
        $data = array();
        $data["expiry"] = time() + 900; // 15 minutes to use the token
        $data["token"] = $token;
        $data["user_id"] = $this->user->id;
        
        $this->db->insert("tokens", $data);
        
        $return["status"] = "OK";
        $return["message"] = $token;
        send($return);
    } 
    
    public function get_credit_packs()
    {
        $return = array();
        $return["status"] = "ERROR";
        $return["message"] = "";
        
        // Check if the login is correct.
        $this->user = $this->account_model->check_login($error_code);
        
        if(!$this->user)
        {
            // Login failed
            $return["message"] = $error_code;                
            send($return);
        }
        
        // get the credit balance for this user.
        $company = $this->account_model->get_company($this->user->company_id);
        if(!$company)
        {
            $return["message"] = "Couldn't load company record";               
            send($return);            
        }
        
        $return["credit_balance"] = $company->credits;
         
        // Load the available credit packs
        $this->db->where("enabled", 1);
        $this->db->order_by("price");
        $rst_packs = $this->db->get("credit_packs");
        
        $packs = array();
        foreach($rst_packs->result() as $pack)
        {
            $item = array();
            $item["id"] = $pack->id;    
            $item["title"] = $pack->title;
            $item["description"] = $pack->description;
            $item["num_credits"] = $pack->num_credits;
            $item["price"] = $pack->price;
            
            $packs[] = $item;
        }
        
        $return["status"] = "OK";
        $return["packs"] = $packs;

        send($return);
    }      
    
    function ajaxwork()
    {
        $type = intval($this->input->post("type", true));
        switch($type)
        {
            //get states
            case 1:
                $country_id = $this->input->post( 'country_id' );
                $states = $this->account_model->get_states($country_id);
                if ($states)
                {
                    $return_data['html'] = '<li title="0" style="display: block;">Choose</li>';
                    foreach ($states->result() as $state)
                    {
                        $return_data['html'] .= '<li title="'. $state->state_id. '">'. $state->name. '</li>';
                    }
                    echo json_encode( $return_data );
                }
                else
                {
                    $return_data['html'] = 0;
                    echo json_encode($return_data);
                }
                
            break;                 
        }
    }
    
    function temp()
    {
        $this->db->select("id, resource_type, parent_id, name");
        $this->db->where("template_id", 1);
        $this->db->order_by("resource_type, id", "ASC");
        $result = $this->db->get("template_items");
        
        $data = array();
        
        foreach($result->result() as $row)
        {
            $item = array();
            
            $item["id"] = $row->id;  
            $item["resource_type"] = $row->resource_type;
            
            if(($row->parent_id != null) && ($row->parent_id != 0))
            {
                $item["parent_id"] = $row->parent_id;
            }
            else
            {
                $item["parent_id"] = "";                
            }
                
            $item["name"] = $row->name;
            
            $data[$row->id] = $item;
        }
        
        echo json_encode($data);
    }    
    
    function copy_template()
    {
        $this->db->select("id, resource_type, parent_id, name");
        $this->db->where("company_id", 1);
        $this->db->where("deleted", 0);
        $this->db->order_by("resource_type, created", "ASC");
        $result = $this->db->get("resources");
        
        $key_no = 1;
        $keys = array();
        
        $data = array();
        
        foreach($result->result() as $row)
        {
            $item = array();
            
            if(!array_key_exists($row->id, $keys))
            {
                $keys[$row->id] = $key_no++;    
            }
            
            $item["id"] = $keys[$row->id];  
            $item["template_id"] = 1;  
            $item["resource_type"] = $row->resource_type;
            
            if($row->parent_id != null)
            {
                if(!array_key_exists($row->parent_id, $keys)) continue;
                $item["parent_id"] = $keys[$row->parent_id];
            }
            else
            {
                $item["parent_id"] = "";                
            }
                
            $item["name"] = $row->name;
            
            $this->db->insert("template_items", $item);
            
            //$data[$keys[$row->id]] = $item;
        }
        
        //echo json_encode($data);
    }	
}

/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */