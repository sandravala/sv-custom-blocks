<?php
$autoplay = isset($attributes['autoplay']) ? (bool) $attributes['autoplay'] : false;
$timeframe = isset($attributes['timeframe']) ? intval($attributes['timeframe']) : 3000;
$fixedHeight = isset($attributes['fixedHeight']) ? (bool) $attributes['fixedHeight'] : false;
$height = $fixedHeight && isset($attributes['height']) ? 'height:' . intval($attributes['height']) . 'vh;' : '';
?>

<div
    data-autoplay="<?php echo esc_attr($autoplay ? 'true' : 'false'); ?>"
    data-timeframe="<?php echo esc_attr($timeframe); ?>"
    class="slider-container"
    style="<?php echo esc_attr($height); ?>"
>
    <?php echo $content; ?>
    <?php if (!$autoplay): ?>
        <button class="slider-nav prev">&lt;</button>
        <button class="slider-nav next">&gt;</button>
    <?php endif;?>
</div>