<?php
    require_once("classes/reportLauncher.class.php");
    require_once("classes/testReportLauncher.class.php");

    $objLauncher = new testReportLauncher();
    if(!$objLauncher->createReport($error_message)) {
        die("ERROR: $error_message");    
    }
    
    // The report was generated OK.
    if(!$objLauncher->getReport($reportData))
    {    
        die("Error getting report data");       
    }   
    
    file_put_contents("test.pdf", $reportData);   

    die("REPORT BUILT OK");
