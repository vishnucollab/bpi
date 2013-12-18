<?php
class PCIReportLauncher extends ReportLauncher
{
	public function __construct($host = "localhost", $port = "59101")
	{
		// Call the parent constructor
		parent:: __construct($port, $host);
		
		// We need a database connection for this report.
		$this->setDatabaseRequired();
		
		// Set output type to PDF
		$this->setOutputType("PDF");
		
        // Each report you create will have a .jrxml file and a .jasper file
        // We use the .jasper file because that is the "compiled" version.
		$this->setReportFile("PCI.jasper");
		
		// Define the POST fields to pass to Jasper
        // You define the paramaters the each unique report wants here
        // And the base class ReportLauncher will read them
        // from the $_POST array and pass them into Jasper.
		$reportFields = array("SUBREPORT_DIR", "INSPECTION_ID");
		
		// Build the report data string
 		$reportData = $this->buildReportData($reportFields);

		// Set the report data string
		$this->setData($reportData);		
	}
}