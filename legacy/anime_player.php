<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Episode scraper</title>
</head>

<body>



    <form method="get" action="">
        <label for="q">Search:</label>
        <input type="text" id="q" name="q" placeholder="anime name" required>

        <label for="n">Number:</label>
        <input type="number" id="n" name="n" placeholder="episode">

        <button type="submit">Search</button>
    </form>




    <?php
    //search example: naruto classico, enen no shouboutai
    if (isset($_GET['q']) && isset($_GET['n'])) {

        $q_clear = str_replace(' ', '-', trim($_GET['q']));
        $n = $_GET['n'];
        $url = "https://animesonlinecc.to/episodio/$q_clear-episodio-$n/";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $html = curl_exec($ch);

        if (curl_errno($ch)) {
            // show an error screen
            echo "<h1>error</h1>";
            exit;
        }

        curl_close($ch);

        
        preg_match_all('/<iframe[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $html, $matches);

        // Show the results
        if (!empty($matches[1])) {
            foreach ($matches[1] as $src) {
             
                echo "<iframe class='metaframe rptss' src='$src' frameborder='0' allowfullscreen></iframe>";
            }
        } else {
            // show an error screen 
            echo "<h1>error</h1>";

            exit;
        }
    }
    ?>
</body>

</html>