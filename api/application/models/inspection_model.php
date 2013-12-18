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
                    
                    ->select("IF(cl.name='',IF(cl.contact='',cl.address1,cl.contact),cl.name) AS `client_name`",false)
                    ->select("CONCAT(IF(cl.name='',cl.contact,cl.name),' / ', cl.address1,IF(cl.address2='','',CONCAT(', ',cl.address2))) AS `client_fullname`", false)
                    
                    ->select('CONCAT(st.address1,st.address2) AS `site_name`')
                    ->select('st.address1 AS `site_address1`')
                    ->select('st.city AS `site_city`')
                    ->select('st.state AS `site_state`')
                    ->select('st.postcode AS `site_postcode`')
                    ->select('st.country AS `site_country`')
                    ->select('st.notes AS `site_notes`')
                    
                    ->select("CONCAT(usr.first_name,' ',usr.last_name) AS `inspector`", false)
                    
                    ->where('is.id', $id)
                    
                    ->join('clients AS `cl`','cl.id = is.client_id','inner')
                    ->join('sites AS `st`','st.id = is.site_id','inner')
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
}