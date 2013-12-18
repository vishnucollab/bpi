<?php

class order_model extends CI_Model 
{
    function __construct()
    {
        parent::__construct();
    }
    
    function get_detail($orderID)
    {
        return $this->db->select('orders.*')
                    ->select("DATE_FORMAT(orders.datetime_created, '%d/%m/%Y') AS created_date", FALSE)
                    ->select("credit_packs.title AS pack_name")
                    ->select("users.company_id")
                    ->select("companies.company_name")
                    ->select("companies.address1")
                    ->select("companies.address2")
                    ->select("companies.suburb")
                    ->select("companies.postcode")
                    ->select("states.name")
                    ->select("countries.country")
//                    ->select("CONCAT('Payment for ',credit_packs.title,' (',orders.no_credit,' credits).') AS order_description")
                    ->join('users','users.id = orders.user_id','inner')
                    ->join('companies','companies.id = users.company_id','inner')
                    ->join('states','states.state_id = companies.state_id','inner')
                    ->join('countries','countries.country_id = companies.country_id','inner')
                    ->join('credit_packs','credit_packs.id = orders.credit_pack_id','inner')
                    ->where('orders.id', $orderID)
                    ->get('orders')
                    ->row();
    }
}