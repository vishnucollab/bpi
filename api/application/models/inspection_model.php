<?php

class inspection_model extends CI_Model 
{
    function __construct()
    {
        parent::__construct();
    }
    
    function get_detail($id='')
    {
        $rs = $this->db->select('`is`.*')
                    ->select('UNIX_TIMESTAMP(is.inspection_date) AS `ts_date_start`')
                    ->select("CONCAT(usr.first_name,' ',usr.last_name) AS `inspector`", false)
                    ->where('is.id', $id)
                    ->join('users AS `usr`','usr.id = is.created_by','inner')
                    ->get('inspections AS `is`');
                    
        if ( isset($_GET['dbug']) ) {
        	echo '<pre>';
        	print_r($this->db->queries);
        	echo '</pre>';
        }
        return $rs->row();
    }
    
    function get_defects( $inspection_id = '' )
    {
        $rs = $this->db->select('isit.*')
                    ->order_by('level','asc')
                    ->where('isit.inspection_id', $inspection_id)
                    ->where('isit.deleted', 0)
                    ->get('inspectionitems AS `isit`');
        $aReturn = array();
        foreach ( $rs->result() as $row )
        {
            $row->photos = $this->get_defect_photos($row->id);
            $aReturn[] = $row;
        }
        return $aReturn;
    }
    
    function get_defect_photos( $inspectionItemId = '' )
    {
        $rs = $this->db->select('isitp.*')
                    ->where('isitp.inspectionitem_id', $inspectionItemId)
                    ->get('inspectionitemphotos AS `isitp`')
                    ->result();
        return $rs;
    }
    
    function get_inspections_for_dropbox()
    {
        // Get a list of inspections that have been finalised but have NOT been sent to dropbox or have been updated
        $this->db->select("i.id, i.report_type, i.inspection_date, ds.sent_dtm, i.modified, ds.id AS dropbox_sent_id");
        $this->db->from("inspections i");
        $this->db->join("dropbox_sent ds", "i.id = ds.foreign_id AND ds.foreign_type = 'inspections'", "left");
        $this->db->where("i.deleted", "0");
        $this->db->where("i.finalised", "1");
        $this->db->where("((ds.sent_dtm IS NULL) OR (i.modified > ds.sent_dtm))");
        
        $rst = $this->db->get();
        if($rst->num_rows() == 0) {
            return false;
        }
        
        return $rst;
    }
}