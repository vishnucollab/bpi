<html>
<body>
<style>
strong {font-size:11pt;color:#662C16;}
table.total td { border-color: #662C16; border-style: solid; }
</style>

<table cellspacing="0" cellpadding="5">
    <tr>
        <td></td>
    </tr>
    <tr>
        <td style="border:2px solid #662C16;">
            <h1>Inspection Report Summary</h1>
            <table>
                <tr>
                    <td><strong>Client:</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Site:</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Inspection Date:</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Inspector:</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Start Time:</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Finish Time:</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>No. Issues:</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td colspan="2"><strong>Notes:</strong><br /><br /></td>
                </tr>
            </table>
        </td>
    </tr>
</table>
<?php foreach ( $inspection->items as $item ) : ?>
    <table cellspacing="0" cellpadding="5" class="total" border="0">
        <tr>
            <td style="border-width:2px;"><strong>Part Number</strong></td>
        </tr>
        <?php if (!empty($item->notes)) : ?>
        <tr>
            <td><?php echo $item->notes?></td>
        </tr>
        <?php endif; ?>
    </table>
    <?php if ( sizeof($item->photos) ) : ?>
    <table cellspacing="0" cellpadding="5" class="total" border="0">
        <tr>
        <?php foreach ( $item->photos as $photo ) : ?>
            <td style="border-width:0 2px 0 2px;">
                laksdlkml
            </td>
        <?php endforeach;?>
        </tr>
    </table>
    <?php endif;?>
<?php endforeach;?>
</body>
</html>