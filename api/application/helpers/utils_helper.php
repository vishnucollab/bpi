<?php

function doLog($message)
{
	$fp = fopen(FCPATH . "debuglog.txt", "a")
		or die("Couldn't open debug log");
		
	fputs($fp, date("Y-m-d H:i:s") . " - " . $message . "\n");
	
	fclose($fp);
}

function send($array)
{
	echo json_encode($array);
	exit();
}