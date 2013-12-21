<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');   

class Inspectionitemphotos_model extends CI_Model 
{
	private $CI;
	
	function Inspectionitemphotos_model()
	{
		parent::__construct();      
        $this->CI = & get_instance();
	}
	
	public function get_photos_for_dropbox($inspection_id)
	{	
		$this->db->select("isitp.id, isitp.photodata_tmb, isitp.modified, ds.id AS dropbox_sent_id");
        $this->db->from("inspectionitemphotos isitp");
        $this->db->join("dropbox_sent ds", "isitp.id = ds.foreign_id AND ds.foreign_type = 'inspectionitemphotos'", "left");
        $this->db->where("isitp.deleted", "0");
        $this->db->where("isitp.inspection_id", $inspection_id);
        $this->db->where("((ds.sent_dtm IS NULL) OR (isitp.modified > ds.sent_dtm))");
		
        $rst = $this->db->get();
        if($rst->num_rows() == 0) {
            return false;
        }
        
        return $rst;
	}
	
	public function get_photo($company_id, $photoid)
	{
		if($photoid == "")
		{
			return false;
		}
		                                                                         
		$result = $this->db->get_where("inspectionitemphotos", array('company_id' => $company_id, 'id' => $photoid));
		
		if(!$result)
		{
			return false;
		}
		else
		{
			return $result->row();	
		}
	}
	
	public function get_detail($itemid)
	{
	    $rs = $this->db->get_where('inspectionitemphotos', array('id'=>$itemid));
	    
	    if($rs->num_rows() == 0)
	    {
			return false;
	    }
	    
	    return $rs->row();
	}
	
	/***
	* Inserts or updates an inspection photo record.
	* 
	* @param mixed $user
	* @param mixed $id
	* @param mixed $data
	*/
	function save($user, $id, $data)
	{
		// Does an existing item exist
		$photo = $this->get_detail($id);
		
		if($photo)
		{
			// Make sure the company id matches
			if($photo->company_id != $user->company_id)
			{
				// This company does NOT have permission to update this photo
				return false;
			}	
			
			// Do an update
			$this->db->where("id", $id);
			$data["modified"] = date("Y-m-d H:i:s A");
			$data["modified_by"] = $user->id;
			
			if(!$this->db->update("inspectionitemphotos", $data))
			{
				return false;
			}
			
			return $id;
		}
		else
		{
			// Inserting a new record
			$data["id"] = $id;
			$data["company_id"] = $user->company_id;
			$data["created"] = date("Y-m-d H:i:s");
			$data["created_by"] = $user->id;			
			$data["modified"] = date("Y-m-d H:i:s");
			$data["modified_by"] = $user->id;	
			
			if(!$this->db->insert("inspectionitemphotos", $data))
			{
				return false;
			}
			
			return $id;
		}
	}
}
