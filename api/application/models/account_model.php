<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');   

class Account_model extends CI_Model 
{
	private $CI;
	
	function Account_model()
	{
		parent::__construct();      
        $this->CI = & get_instance();
	}

	/***
	* create_salt
	* Creates a 10 character 10 value for use with hashing login passwords.
	*/
	public function create_salt()
	{
		// Seed the random number generator
		srand();
		
		// Define valid salt characters
		$validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefhijklmnopqrstuvwxyz0123456789!@#*_-";
		
		$numChars = strlen($validChars);
		$found = false;
		
		$salt = "";
			
		for($x = 0; $x < 10; $x++)
			$salt .= substr($validChars, rand(0, $numChars - 1), 1);
		
		return $salt;
	}
	
	/***
	* @method get_account
	* @desc Loads an account from the database via the specified email address.
	* 
	* @param string $email The users email address
	*/
	public function get_account($email)
	{
		$query = $this->db->get_where('users', array('email' => $email));

		// If there is a resulting row, check that the password matches.
		if($query->num_rows() == 1)
			return $query->row();
		else
			return false;
	}
    
    /***
    * @method get_account_by_id
    * @desc Loads an account from the database via the specified user id.
    * 
    * @param string $user_id The users id
    */                                   
    public function get_account_by_id($user_id)
    {
        $query = $this->db->get_where('users', array('id' => $user_id));

        // If there is a resulting row, check that the password matches.
        if($query->num_rows() == 1)
            return $query->row();
        else
            return false;
    }    
	
	function create_account($data)
	{
		// Start the transaction
		$this->db->trans_start();
		
		// Create the company record
		$company_data = array();
		//$company_data["company_name"] = $data["company_name"];
		//$company_data["address1"] = $data["address1"];
        //$company_data["address2"] = $data["address2"];
       //$company_data["suburb"] = $data["suburb"];
        //$company_data["postcode"] = $data["postcode"];
       // $company_data["country_id"] = $data["country_id"];
        //$company_data["state_id"] = $data["state_id"];
        //$company_data["phone"] = $data["phone"];
        //$company_data["fax"] = $data["fax"];
        $company_data["mobile"] = $data["mobile"];
        $company_data["email"] = strtolower($data["email"]);
		
		if(!$this->db->insert("companies", $company_data))
			return false;
		
		// Get the id of the new company record
		$company_id = $this->db->insert_id();

		
		// Create the user record
		$user_data = array();
		$salt = $this->create_salt();
		//$user_data["company_id"] = $company_id;
		$user_data["email"] = strtolower($data["email"]);
		$user_data["first_name"] = $data["first_name"];
		$user_data["last_name"] = $data["last_name"];
        //$user_data["initials"] = $data["initials"];
		$user_data["password"] = md5(strtolower($data["password"]) . $salt);
		$user_data["salt"] = $salt;
        //$user_data["address1"] = $data["address1"];
       // $user_data["address2"] = $data["address1"];
       // $user_data["city"] = $data["suburb"];
        //$user_data["postcode"] = $data["postcode"];
        //$user_data["country_id"] = $data["country_id"];
        //$user_data["state_id"] = $data["state_id"];
        //$user_data["phone"] = $data["phone"];
        //$user_data["fax"] = $data["fax"];
        $user_data["mobile"] = $data["mobile"];        
		
		if(!$this->db->insert("users", $user_data))
			return false;
			
		$user_id = $this->db->insert_id();
        
        // Insert a credit pack so the user has some credits to play with
        $trans = array();
        $trans["created_date"] = date("Y-m-d H:i:s");
        $trans["company_id"] = $company_id;
        $trans["user_id"] = $user_id;
        $trans["credit_pack_id"] = 1;
        $trans["num_credits"] = 20;
        $trans["amount"] = 0;
        $trans["tax_amount"] = 0;
        $trans["status"] = "completed";
        $trans["transaction_num"] = "SIGNUP";
        
        if(!$this->db->insert("credit_transactions", $trans))
            return false;        
			
		$this->db->trans_complete();
		
		return true;
	}
	
	function update_last_sync_date($user_id)
	{
 		$data = array("last_sync_date" => date("Y-m-d H:i:s"));
 		
 		$this->db->where("id", $user_id);		
 		$this->db->update("users", $data);
	}
	
	public function check_login(&$error_code = "")
	{
        $this->CI->load->library('form_validation');

        $this->CI->form_validation->set_rules('password', 'Password', 'required|xss_clean|trim|max_length[50]|min_length[5]');
        $this->CI->form_validation->set_rules('email', 'Email', 'required|xss_clean|trim|email');
        
        // Check form submission against validation rules
        if ($this->form_validation->run() == FALSE)
        {
        	$error_code = "VALIDATION";
    		return false;
        }
        
        // Read in the values
        $email = strtolower($this->CI->input->post("email"));        
        $password = strtolower($this->CI->input->post("password"));
        
        doLog("Checking login for: $email");
        
        // Load the users account if possible
        $user = $this->get_account($email);
        
        if(!$user)
        {
        	$error_code = "NOACCOUNT";
    		return false;		
        }  
        
        // Check the users password against the stored hash
        $hash = md5($password . $user->salt);
        
        if($hash != $user->password)
        {
        	$error_code = "PASSWORD";
    		return false;				
        }    
        
		return $user;	
	}
	
	public function get_company($company_id)
	{
		if(($company_id == "") || (!is_numeric($company_id)))
		{
			return false;
		}
		
		$result = $this->db->get_where("companies", array('id' => $company_id));
		
		if(!$result)
		{
			return false;
		}
		else
		{
			return $result->row();	
		}
	}
    
    /***
    * Update the credit balance of the specified company.
    * 
    * @param integer $company_id The id of the company that we want to update the credit balance for.  This should be called immediately after syncing or a
    * any other transaction that incurs a credit debt.
    */
    public function update_credit_balance($company_id)
    {
        if(!is_numeric($company_id)) return;
        
        $credit_balance = $this->get_credit_balance($company_id);    
        
        if((!is_numeric($credit_balance)) || ($credit_balance < 0))
        {
            $credit_balance = 0;    
        }
        
        $this->db->where("id", $company_id);
        $this->db->update("companies", array("credits" => $credit_balance));  
    }
    
    /***
    * Returns the number of credits currently available for the specified account
    * 
    * @param int $company_id The company id to get the credit balance for
    * @returns The credit balance
    */
    public function get_credit_balance($company_id)
    {
        $sql = "SELECT ( ".
            "SELECT SUM(num_credits) " .
            "FROM credit_transactions " .
            "WHERE company_id = %d " .
            "AND status = 'completed' " .
            ") - " .
            "(SELECT COUNT(id) " .
            "FROM inspections " . 
            "WHERE company_id = %d) as credits_available";
            
        $sql = sprintf($sql, $company_id, $company_id);
        
        $result = $this->db->query($sql);
        if(!$result)
        {
            return 0;    
        }
        
        $row = $result->row();
        
        return $row->credits_available;
    }
}
