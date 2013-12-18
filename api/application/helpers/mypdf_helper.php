<?php

$ci =& get_instance();
$ci->load->library('tcpdf/tcpdf');

class MYPDF extends TCPDF
{
    var $str_header = '';
    
    function setStrHeader($text='')
    {
        $this->str_header = $text;
    }
    
    public function Header()
    {
        $bMargin = $this->getBreakMargin();
        $auto_page_break = $this->AutoPageBreak;
        $this->SetAutoPageBreak(false, 0);
        
        $img_file = FCPATH . 'assets/bg-report-inner.png';
        $this->Image($img_file, 0, 0, 210, 297, '', '', '', false, 300, '', false, false, 0);

        $this->SetAutoPageBreak($auto_page_break, $bMargin);
        $this->setPageMark();
        
        $this->headerText($this->str_header);
    }
    
    function headerText($text='', $company='')
    {
        if ( !empty($text) ) {
            $this->SetY(6);
            $this->SetFont('futuralt', '', 10);
            $this->SetRightMargin(10);
            $this->SetLeftMargin(10);
            $this->Cell(0, 10, $text, 0, false, 'R', 0, '', 0, false, 'T', 'M');
            $this->SetY(10);
            $this->Cell(0, 10, $company, 0, false, 'R', 0, '', 0, false, 'T', 'M');
        }
    }
    
    public function Footer() {
        // Position at 15 mm from bottom
        $this->SetY(-17);
        // Set font
        $this->SetFont('futuralt', '', 10);
        
        $this->SetRightMargin(5);
        $this->SetLeftMargin(5);
        // Page number
        $this->Cell(0, 10, 'Page '.$this->getAliasNumPage().' of '.$this->getAliasNbPages(), 0, false, 'R', 0, '', 0, false, 'T', 'M');
    }
    
    function getAutoPageBreak()
    {
        return $this->AutoPageBreak;
    }
}

    