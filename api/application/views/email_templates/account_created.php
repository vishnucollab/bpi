<p>Hi there <?=$first_name?>, thanks for creating an account with Planet Earth!</p>
<p>For future reference, your login details are as follows:</p>
<p>
	Email: <?=$email?><br />
	Password: <?=$password?>
</p>
<p>
    Please click <a href="<?=substr(base_url(),0,strlen(base_url())-4)?>admin/auth/activation/<?=$activation_code?>">here</a> to active your account. 
</p>
<p>
	We hope you enjoy our sites and if you have any questions please don&#39;t hesitate to contact our support team.
 </p>
 
<p>
    With thanks,
</p>
