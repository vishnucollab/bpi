<?php
class MY_Controller extends CI_Controller 
{
    protected $user; // Will hold an instance of a user object if authentication succeeds
    
    function MY_Controller ()
    {                 
        parent::__construct();
        
        $this->user = false;
        
        $this->output->set_header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
        $this->output->set_header("Cache-Control: no-store, no-cache, must-revalidate");
        $this->output->set_header("Cache-Control: post-check=0, pre-check=0", false);
        $this->output->set_header("Pragma: no-cache");          
        
        // Check for token based auth
        $token = $this->input->get("token");

        if($token != "")
        {
            // A token has been provided.  It must be 15 chars long.
            if(strlen($token) != 15)
            {
                show_error("Invalid Token - Error Code 1");
            }   
            
            // Does the token exist in the db, and is it still valid (not expired)
            $result = $this->db->get_where("tokens", array("token" => $token, "expiry >=" => time()));
            if($result->num_rows() != 1)
            {
                show_error("Invalid Token - Error code 2");
            }
            
            // The token is valid
            $token = $result->row();
            
            // Load the associated user row
            $user_id = $token->user_id;
            $this->user = $this->account_model->get_account_by_id($user_id);
            
            // Delete the token from the db.
            //$this->db->delete("tokens", array("token" => $token->token));
        }
        else
        {      
            // No token - there must be email / pass authentication then.
            // Read in authentication vars and test
            $email = $this->input->post("email");
            $password = $this->input->post("password");
            
            if(($email == "") || ($password == ""))
            {
                show_error("Invalid request - missing authentication params");    
            }
            
            $this->user = $this->account_model->get_account($email);
            if(!$this->user)
            {
                show_error("Authentication failure - Error code 1");   
            }
            
            if(md5($password . $this->user->salt) != $this->user->password)
            {
                show_error("Authentication failure - Error code 2");               
            }
        }
    }
} 