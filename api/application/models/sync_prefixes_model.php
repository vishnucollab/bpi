<?php
class Sync_prefixes_model extends CI_Model
{
	function Sync_prefixes_model()
	{
		// Call the Model constructor
		parent::__construct();      
	}

	function get_prefix()
	{
		// Seed the random number generator
		srand();
		
		// Define valid prefix characters
		$validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefhijklmnopqrstuvwxyz0123456789!@#*_-";
		
		$numChars = strlen($validChars);
		$found = false;
		
		// Loop until we create a prefix that has not yet been taken
		while(!$found)
		{
			$prefix = "";
			
			for($x = 0; $x < 5; $x++)
				$prefix .= substr($validChars, rand(0, $numChars - 1), 1);
			
			$found = $this->prefix_available($prefix);
		}
		
		$this->save($prefix);
		
		return $prefix;
	}
	
	/***
	* @method prefix_available
	* @desc Determines whether the passed prefix exists in the database or not.
	* 
	* @param string $prefix The prefix to check
	*/
	function prefix_available($prefix)
	{
		$query = $this->db->get_where('sync_prefixes', array('prefix' => $prefix));

		// If there is a resulting row, check that the password matches.
		return ($query->num_rows() == 0);
	}
	
	/***
	* @method save
	* @desc Saves the specified prefix to the database
	* 
	* @param string $prefix The prefix to save
	*/	
	function save($prefix)
	{
		$data = array();
		$data["prefix"] = $prefix;
		$data["ipaddress"] = $this->input->ip_address();
		
		if(!$this->db->insert("sync_prefixes", $data))
			show_error("Failed to save sync prefix");
	}
}