<?php
class InvoiceLauncher extends ReportLauncher
{
	public function __construct($host = "localhost", $port = "59101")
	{
		// Call the parent constructor
		parent:: __construct($port, $host);
		
		// We need a database connection for this report.
		$this->setDatabaseRequired();
		
		// Set output type to PDF
		$this->setOutputType("PDF");
		
		$this->setReportFile("invoice2.jasper");
		
		// Define the POST fields to pass to Jasper
		$reportFields = array("OrderID");
		
		// Build the report data string
 		$reportData = $this->buildReportData($reportFields);

		// Set the report data string
		$this->setData($reportData);		
	}
}