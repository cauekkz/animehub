<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>



    <form method="get" action="">
        <label for="q">Pesquisar:</label>
        <input type="text" id="q" name="q" placeholder="nome anime" required>

        <label for="n">Número:</label>
        <input type="number" id="n" name="n" placeholder="episodio">

        <button type="submit">Buscar</button>
    </form>




    <?php
    //ex de pesquisa: naruto classico, enen no shouboutai
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
            //bora mostrar uma tela de erro
            echo "<h1>erroo</h1>";
            exit;
        }

        curl_close($ch);


        preg_match_all('/<iframe[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $html, $matches);

        // Exibe os resultados
        if (!empty($matches[1])) {
            foreach ($matches[1] as $src) {
             
                echo "<iframe class='metaframe rptss' src='$src' frameborder='0' allowfullscreen></iframe>";
            }
        } else {
            //bora mostrar uma tela de erro 
            echo "<h1>erroo</h1>";

            exit;
        }
    }
    ?>
</body>

</html>